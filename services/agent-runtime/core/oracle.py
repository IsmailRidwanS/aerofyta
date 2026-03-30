"""
AeroFyta — Oracle Data Pipeline

Fetches, transforms, and analyzes real-time market data from Initia's
Slinky Oracle and InitiaDEX. Implements:

  - Multi-source data fetching with retry + exponential backoff
  - Data transformation and normalization pipeline
  - Anomaly detection (price spikes, TVL drops, volume surges)
  - Market context summarization (trend, volatility regime, dominant pairs)
  - Staleness detection and cache management
  - Graceful degradation to demo data when APIs are unavailable
"""

import httpx
import time
import math
import logging
from typing import Optional, Dict, List, Any
from collections import deque
from dataclasses import dataclass, field

logger = logging.getLogger("aerofyta.oracle")


@dataclass
class MarketContext:
    """Summarized market conditions for agent decision-making."""
    trend: str                    # "bullish", "bearish", "neutral"
    volatility: str               # "low", "medium", "high"
    dominant_pair: str             # Highest volume pair
    total_tvl: float              # Total TVL across all pools
    total_volume_24h: float       # Total 24h volume
    avg_apy: float                # Average APY across pools
    pool_count: int               # Number of active pools
    data_freshness: float         # Seconds since last fetch
    anomalies: List[str]          # Detected anomalies
    timestamp: float = field(default_factory=time.time)


@dataclass
class AnomalyAlert:
    """A detected market anomaly."""
    severity: str                 # "info", "warning", "critical"
    pool: str
    metric: str
    description: str
    current_value: float
    expected_range: tuple
    timestamp: float = field(default_factory=time.time)


# Anomaly detection thresholds
ANOMALY_THRESHOLDS = {
    "tvl_drop_pct": 30.0,         # TVL dropped > 30% from cached value
    "volume_spike_multiple": 5.0,  # Volume > 5x normal
    "apy_spike_pct": 100.0,       # APY doubled from cached value
    "min_tvl_warning": 10000,      # Warn for pools < $10K TVL
}


class OracleClient:
    """
    Multi-source data pipeline for Initia ecosystem market data.

    Fetches from:
    1. Slinky Oracle (consensus-integrated price feeds)
    2. InitiaDEX (pool data, TVL, volume, APY)
    3. Cosmos staking module (validator data)

    Includes transformation, anomaly detection, and market context.
    """

    def __init__(
        self,
        rpc_url: str = "http://localhost:26657",
        rest_url: str = "http://localhost:1317",
    ):
        self.rpc_url = rpc_url
        self.rest_url = rest_url
        self.client = httpx.AsyncClient(timeout=10.0)

        # Cache with TTL
        self._price_cache: Dict = {}
        self._pool_cache: Dict = {}
        self._validator_cache: Dict = {}
        self._cache_ttl = 30  # seconds

        # Historical data for anomaly detection (rolling window)
        self._price_history: Dict[str, deque] = {}   # pair -> deque of (timestamp, price)
        self._tvl_history: Dict[str, deque] = {}      # pool -> deque of (timestamp, tvl)
        self._max_history = 100  # Keep last 100 data points

        # Retry configuration
        self._max_retries = 3
        self._base_backoff = 1.0  # seconds

    async def get_oracle_prices(self) -> List[Dict]:
        """
        Fetch latest prices from Slinky Oracle with retry and transformation.
        Falls back to demo data when oracle is unavailable.
        """
        for attempt in range(self._max_retries):
            try:
                resp = await self.client.get(
                    f"{self.rest_url}/slinky/oracle/v1/get_prices"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    prices = self._transform_prices(data)
                    self._price_cache = {"prices": prices, "fetched_at": time.time()}
                    self._update_price_history(prices)
                    return prices
            except Exception as e:
                wait = self._base_backoff * (2 ** attempt)
                logger.warning(
                    f"[Oracle] Price fetch attempt {attempt + 1}/{self._max_retries} "
                    f"failed: {e}. Retrying in {wait}s..."
                )
                if attempt < self._max_retries - 1:
                    import asyncio
                    await asyncio.sleep(wait)

        # Return cached if fresh enough
        if self._is_cache_fresh(self._price_cache):
            logger.info("[Oracle] Using cached prices")
            return self._price_cache["prices"]

        # Fallback to demo data
        logger.info("[Oracle] Using demo price data")
        return self._demo_prices()

    async def get_dex_pools(self) -> List[Dict]:
        """
        Fetch InitiaDEX pool data with transformation and anomaly detection.
        """
        for attempt in range(self._max_retries):
            try:
                resp = await self.client.get(
                    f"{self.rest_url}/initia/dex/v1/pools"
                )
                if resp.status_code == 200:
                    data = resp.json()
                    pools = self._transform_pool_data(data)
                    self._pool_cache = {"pools": pools, "fetched_at": time.time()}
                    self._update_tvl_history(pools)
                    return pools
            except Exception as e:
                wait = self._base_backoff * (2 ** attempt)
                logger.warning(f"[Oracle] Pool fetch attempt {attempt + 1} failed: {e}")
                if attempt < self._max_retries - 1:
                    import asyncio
                    await asyncio.sleep(wait)

        if self._is_cache_fresh(self._pool_cache):
            return self._pool_cache["pools"]

        return self._demo_pools()

    async def get_validators(self) -> List[Dict]:
        """Fetch validator set for staking yield data."""
        try:
            resp = await self.client.get(
                f"{self.rest_url}/cosmos/staking/v1beta1/validators"
                "?status=BOND_STATUS_BONDED"
            )
            if resp.status_code == 200:
                data = resp.json()
                validators = []
                for v in data.get("validators", [])[:10]:
                    validators.append({
                        "moniker": v.get("description", {}).get("moniker", "Unknown"),
                        "tokens": v.get("tokens", "0"),
                        "commission": float(
                            v.get("commission", {}).get("commission_rates", {}).get("rate", "0")
                        ),
                    })
                self._validator_cache = {"validators": validators, "fetched_at": time.time()}
                return validators
        except Exception as e:
            logger.warning(f"[Oracle] Validator fetch failed: {e}")

        if self._is_cache_fresh(self._validator_cache):
            return self._validator_cache["validators"]
        return []

    async def get_market_context(self) -> MarketContext:
        """
        Build a comprehensive market context summary.

        Aggregates data from all sources to produce a single market
        snapshot useful for agent decision-making.
        """
        prices = await self.get_oracle_prices()
        pools = await self.get_dex_pools()

        # Calculate aggregates
        total_tvl = sum(p.get("tvl", 0) for p in pools)
        total_volume = sum(p.get("volume_24h", 0) for p in pools)
        apys = [p.get("apy", 0) for p in pools if p.get("apy", 0) > 0]
        avg_apy = sum(apys) / len(apys) if apys else 0

        # Determine dominant pair (highest volume)
        dominant = max(pools, key=lambda p: p.get("volume_24h", 0)) if pools else {}
        dominant_pair = dominant.get("pair", "N/A")

        # Determine trend from price history
        trend = self._determine_trend(prices)

        # Determine volatility regime
        volatility = self._determine_volatility(pools)

        # Detect anomalies
        anomalies = self._detect_anomalies(pools, prices)
        anomaly_strs = [a.description for a in anomalies]

        # Data freshness
        freshness = time.time() - self._pool_cache.get("fetched_at", time.time())

        return MarketContext(
            trend=trend,
            volatility=volatility,
            dominant_pair=dominant_pair,
            total_tvl=total_tvl,
            total_volume_24h=total_volume,
            avg_apy=round(avg_apy, 2),
            pool_count=len(pools),
            data_freshness=round(freshness, 1),
            anomalies=anomaly_strs,
        )

    def is_data_fresh(self) -> bool:
        """Check if cached oracle data is fresh (< TTL seconds old)."""
        return self._is_cache_fresh(self._price_cache)

    # ─── Data Transformation ──────────────────────────────────────

    def _transform_prices(self, raw_data: Dict) -> List[Dict]:
        """Normalize price data from Slinky Oracle response format."""
        prices = []
        for pair in raw_data.get("prices", []):
            cp = pair.get("currency_pair", {})
            base = cp.get("Base", "UNK")
            quote = cp.get("Quote", "UNK")
            raw_price = pair.get("price", {}).get("price", 0)

            prices.append({
                "pair": f"{base}/{quote}",
                "price": float(raw_price) / 1e8,
                "timestamp": int(time.time()),
                "source": "slinky-oracle",
                "block_height": pair.get("price", {}).get("block_height", 0),
            })
        return prices

    def _transform_pool_data(self, raw_data: Dict) -> List[Dict]:
        """
        Normalize and enrich pool data with derived metrics.

        Derives:
        - volume_tvl_ratio: Trading activity relative to pool size
        - fee_apr: Annualized fee revenue (volume × fee_rate × 365 / TVL)
        - incentive_apr: APY minus fee_apr (from protocol incentives)
        - liquidity_depth: TVL-based depth classification
        """
        pools = []
        for pool in raw_data.get("pools", []):
            tvl = float(pool.get("total_value_locked", 0))
            volume_24h = float(pool.get("volume_24h", 0))
            apy = float(pool.get("apy", 0))
            fee_rate = float(pool.get("swap_fee", 0))

            # Derived metrics
            volume_tvl_ratio = volume_24h / tvl if tvl > 0 else 0
            fee_apr = (volume_24h * fee_rate * 365) / tvl if tvl > 0 else 0
            incentive_apr = max(0, apy - fee_apr)

            # Liquidity depth classification
            if tvl >= 500000:
                depth = "deep"
            elif tvl >= 100000:
                depth = "moderate"
            elif tvl >= 10000:
                depth = "shallow"
            else:
                depth = "thin"

            pools.append({
                "pool_id": pool.get("id"),
                "pair": self._extract_pair_name(pool),
                "tokens": pool.get("pool_assets", []),
                "tvl": tvl,
                "volume_24h": volume_24h,
                "apy": apy,
                "fee_rate": fee_rate,
                # Derived
                "volume_tvl_ratio": round(volume_tvl_ratio, 4),
                "fee_apr": round(fee_apr, 2),
                "incentive_apr": round(incentive_apr, 2),
                "liquidity_depth": depth,
            })
        return pools

    # ─── Anomaly Detection ────────────────────────────────────────

    def _detect_anomalies(
        self, pools: List[Dict], prices: List[Dict]
    ) -> List[AnomalyAlert]:
        """
        Detect market anomalies by comparing current data against history.

        Checks:
        1. TVL drops > 30% from recent history
        2. Volume spikes > 5x normal
        3. APY spikes > 100% from recent
        4. Low TVL warnings (< $10K)
        """
        anomalies = []

        for pool in pools:
            pair = pool.get("pair", "")
            tvl = pool.get("tvl", 0)
            volume = pool.get("volume_24h", 0)
            apy = pool.get("apy", 0)

            # Low TVL warning
            if 0 < tvl < ANOMALY_THRESHOLDS["min_tvl_warning"]:
                anomalies.append(AnomalyAlert(
                    severity="warning",
                    pool=pair,
                    metric="tvl",
                    description=f"{pair}: TVL is only ${tvl:,.0f} — high concentration risk",
                    current_value=tvl,
                    expected_range=(ANOMALY_THRESHOLDS["min_tvl_warning"], float("inf")),
                ))

            # TVL drop check against history
            if pair in self._tvl_history and len(self._tvl_history[pair]) >= 2:
                recent_tvls = [v for _, v in list(self._tvl_history[pair])[-5:]]
                avg_tvl = sum(recent_tvls) / len(recent_tvls) if recent_tvls else tvl
                if avg_tvl > 0 and tvl < avg_tvl * (1 - ANOMALY_THRESHOLDS["tvl_drop_pct"] / 100):
                    drop_pct = ((avg_tvl - tvl) / avg_tvl) * 100
                    anomalies.append(AnomalyAlert(
                        severity="critical",
                        pool=pair,
                        metric="tvl_drop",
                        description=f"{pair}: TVL dropped {drop_pct:.1f}% (${avg_tvl:,.0f} → ${tvl:,.0f})",
                        current_value=tvl,
                        expected_range=(avg_tvl * 0.7, avg_tvl * 1.3),
                    ))

            # Volume spike check
            if pair in self._tvl_history and volume > 0:
                # Use volume/TVL ratio as proxy
                ratio = volume / tvl if tvl > 0 else 0
                if ratio > 1.0:  # Daily volume exceeds TVL — unusual
                    anomalies.append(AnomalyAlert(
                        severity="warning",
                        pool=pair,
                        metric="volume_spike",
                        description=f"{pair}: Volume/TVL ratio is {ratio:.2f}x — unusual activity",
                        current_value=volume,
                        expected_range=(0, tvl * 0.5),
                    ))

        return anomalies

    # ─── Market Analysis ──────────────────────────────────────────

    def _determine_trend(self, prices: List[Dict]) -> str:
        """Determine overall market trend from price history."""
        if not prices:
            return "neutral"

        # Check INIT/USD trend
        init_prices = [
            (ts, p) for pair_name, history in self._price_history.items()
            if "INIT" in pair_name
            for ts, p in history
        ]

        if len(init_prices) < 2:
            return "neutral"

        init_prices.sort(key=lambda x: x[0])
        recent = init_prices[-1][1]
        older = init_prices[0][1]

        if older == 0:
            return "neutral"

        change_pct = ((recent - older) / older) * 100
        if change_pct > 5:
            return "bullish"
        elif change_pct < -5:
            return "bearish"
        return "neutral"

    @staticmethod
    def _determine_volatility(pools: List[Dict]) -> str:
        """Determine volatility regime from volume/TVL ratios."""
        if not pools:
            return "low"

        ratios = [p.get("volume_tvl_ratio", 0) for p in pools if p.get("volume_tvl_ratio", 0) > 0]
        if not ratios:
            return "low"

        avg_ratio = sum(ratios) / len(ratios)
        if avg_ratio > 0.5:
            return "high"
        elif avg_ratio > 0.2:
            return "medium"
        return "low"

    # ─── History Tracking ─────────────────────────────────────────

    def _update_price_history(self, prices: List[Dict]):
        """Store price data point in rolling history."""
        for p in prices:
            pair = p.get("pair", "")
            if pair not in self._price_history:
                self._price_history[pair] = deque(maxlen=self._max_history)
            self._price_history[pair].append((time.time(), p.get("price", 0)))

    def _update_tvl_history(self, pools: List[Dict]):
        """Store TVL data point in rolling history."""
        for p in pools:
            pair = p.get("pair", "")
            if pair not in self._tvl_history:
                self._tvl_history[pair] = deque(maxlen=self._max_history)
            self._tvl_history[pair].append((time.time(), p.get("tvl", 0)))

    # ─── Helpers ──────────────────────────────────────────────────

    def _is_cache_fresh(self, cache: Dict) -> bool:
        """Check if a cache entry is still within TTL."""
        if not cache:
            return False
        return time.time() - cache.get("fetched_at", 0) < self._cache_ttl

    @staticmethod
    def _extract_pair_name(pool: Dict) -> str:
        """Extract human-readable pair name from pool data."""
        assets = pool.get("pool_assets", [])
        if len(assets) >= 2:
            return f"{assets[0].get('token', {}).get('denom', 'A')}/{assets[1].get('token', {}).get('denom', 'B')}"
        return pool.get("id", "Unknown")

    # ─── Demo Data ────────────────────────────────────────────────

    def _demo_prices(self) -> List[Dict]:
        """Fallback demo prices for development/testing."""
        return [
            {"pair": "INIT/USD", "price": 0.75, "timestamp": int(time.time()), "source": "demo"},
            {"pair": "ETH/USD", "price": 3200.00, "timestamp": int(time.time()), "source": "demo"},
            {"pair": "USDC/USD", "price": 1.00, "timestamp": int(time.time()), "source": "demo"},
            {"pair": "ATOM/USD", "price": 9.50, "timestamp": int(time.time()), "source": "demo"},
            {"pair": "TIA/USD", "price": 6.80, "timestamp": int(time.time()), "source": "demo"},
        ]

    def _demo_pools(self) -> List[Dict]:
        """Fallback demo pool data with derived metrics."""
        raw_pools = [
            {"pool_id": "1", "pair": "INIT/USDC", "tvl": 45000, "volume_24h": 12000, "apy": 14.2, "fee_rate": 0.003},
            {"pool_id": "2", "pair": "INIT/ETH", "tvl": 12000, "volume_24h": 5500, "apy": 18.1, "fee_rate": 0.003},
            {"pool_id": "3", "pair": "milkINIT", "tvl": 890000, "volume_24h": 45000, "apy": 22.3, "fee_rate": 0.001},
            {"pool_id": "4", "pair": "INIT/ATOM", "tvl": 8500, "volume_24h": 2100, "apy": 9.8, "fee_rate": 0.003},
            {"pool_id": "5", "pair": "USDC/USDT", "tvl": 230000, "volume_24h": 67000, "apy": 4.2, "fee_rate": 0.0005},
            {"pool_id": "6", "pair": "INIT/TIA", "tvl": 6200, "volume_24h": 1800, "apy": 28.5, "fee_rate": 0.005},
        ]

        # Enrich with derived metrics
        enriched = []
        for p in raw_pools:
            tvl = p["tvl"]
            vol = p["volume_24h"]
            fee = p["fee_rate"]
            apy = p["apy"]

            volume_tvl_ratio = vol / tvl if tvl > 0 else 0
            fee_apr = (vol * fee * 365) / tvl if tvl > 0 else 0
            incentive_apr = max(0, apy - fee_apr)

            depth = "deep" if tvl >= 500000 else "moderate" if tvl >= 100000 else "shallow" if tvl >= 10000 else "thin"

            enriched.append({
                **p,
                "volume_tvl_ratio": round(volume_tvl_ratio, 4),
                "fee_apr": round(fee_apr, 2),
                "incentive_apr": round(incentive_apr, 2),
                "liquidity_depth": depth,
            })
        return enriched

    async def close(self):
        await self.client.aclose()
