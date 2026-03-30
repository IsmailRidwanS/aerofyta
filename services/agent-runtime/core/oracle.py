"""
AeroFyta — Slinky Oracle & InitiaDEX Data Fetcher
Fetches real-time pool data and prices from Initia's on-chain sources.
"""

import httpx
import time
from typing import Optional


class OracleClient:
    """Fetches real-time data from Initia's Slinky Oracle and InitiaDEX."""

    def __init__(self, rpc_url: str, rest_url: str):
        self.rpc_url = rpc_url
        self.rest_url = rest_url
        self.client = httpx.AsyncClient(timeout=10.0)
        self._price_cache: dict = {}
        self._cache_ttl = 30  # seconds

    async def get_oracle_prices(self) -> list[dict]:
        """Fetch latest prices from Slinky Oracle via Initia REST API."""
        try:
            # Slinky oracle prices are available via the oracle module
            resp = await self.client.get(f"{self.rest_url}/slinky/oracle/v1/get_prices")
            if resp.status_code == 200:
                data = resp.json()
                prices = []
                for pair in data.get("prices", []):
                    prices.append({
                        "pair": pair.get("currency_pair", {}).get("Base", "UNK") + "/" + pair.get("currency_pair", {}).get("Quote", "UNK"),
                        "price": float(pair.get("price", {}).get("price", 0)) / 1e8,
                        "timestamp": int(time.time()),
                        "source": "slinky-oracle",
                    })
                self._price_cache = {"prices": prices, "fetched_at": time.time()}
                return prices
        except Exception as e:
            print(f"[Oracle] Error fetching prices: {e}")

        # Return cached if available
        if self._price_cache and time.time() - self._price_cache.get("fetched_at", 0) < self._cache_ttl:
            return self._price_cache["prices"]

        # Fallback demo prices
        return self._demo_prices()

    async def get_dex_pools(self) -> list[dict]:
        """Fetch InitiaDEX pool data."""
        try:
            resp = await self.client.get(f"{self.rest_url}/initia/dex/v1/pools")
            if resp.status_code == 200:
                data = resp.json()
                pools = []
                for pool in data.get("pools", []):
                    pools.append({
                        "pool_id": pool.get("id"),
                        "tokens": pool.get("pool_assets", []),
                        "tvl": float(pool.get("total_value_locked", 0)),
                        "volume_24h": float(pool.get("volume_24h", 0)),
                        "apy": float(pool.get("apy", 0)),
                        "fee_rate": float(pool.get("swap_fee", 0)),
                    })
                return pools
        except Exception as e:
            print(f"[Oracle] Error fetching pools: {e}")

        # Fallback demo pools
        return self._demo_pools()

    async def get_validators(self) -> list[dict]:
        """Fetch validator set for staking yield data."""
        try:
            resp = await self.client.get(f"{self.rest_url}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED")
            if resp.status_code == 200:
                data = resp.json()
                validators = []
                for v in data.get("validators", [])[:10]:
                    validators.append({
                        "moniker": v.get("description", {}).get("moniker", "Unknown"),
                        "tokens": v.get("tokens", "0"),
                        "commission": float(v.get("commission", {}).get("commission_rates", {}).get("rate", "0")),
                    })
                return validators
        except Exception as e:
            print(f"[Oracle] Error fetching validators: {e}")
        return []

    def is_data_fresh(self) -> bool:
        """Check if cached oracle data is fresh (< 30 seconds old)."""
        if not self._price_cache:
            return False
        return time.time() - self._price_cache.get("fetched_at", 0) < self._cache_ttl

    def _demo_prices(self) -> list[dict]:
        """Fallback demo prices for development/testing."""
        return [
            {"pair": "INIT/USD", "price": 0.75, "timestamp": int(time.time()), "source": "demo"},
            {"pair": "ETH/USD", "price": 3200.00, "timestamp": int(time.time()), "source": "demo"},
            {"pair": "USDC/USD", "price": 1.00, "timestamp": int(time.time()), "source": "demo"},
        ]

    def _demo_pools(self) -> list[dict]:
        """Fallback demo pool data for development/testing."""
        return [
            {"pool_id": "1", "pair": "INIT/USDC", "tvl": 45000, "volume_24h": 12000, "apy": 14.2, "fee_rate": 0.003},
            {"pool_id": "2", "pair": "INIT/ETH", "tvl": 12000, "volume_24h": 5500, "apy": 18.1, "fee_rate": 0.003},
            {"pool_id": "3", "pair": "milkINIT", "tvl": 890000, "volume_24h": 45000, "apy": 22.3, "fee_rate": 0.001},
            {"pool_id": "4", "pair": "INIT/ATOM", "tvl": 8500, "volume_24h": 2100, "apy": 9.8, "fee_rate": 0.003},
            {"pool_id": "5", "pair": "USDC/USDT", "tvl": 230000, "volume_24h": 67000, "apy": 4.2, "fee_rate": 0.0005},
            {"pool_id": "6", "pair": "INIT/TIA", "tvl": 6200, "volume_24h": 1800, "apy": 28.5, "fee_rate": 0.005},
        ]

    async def close(self):
        await self.client.aclose()
