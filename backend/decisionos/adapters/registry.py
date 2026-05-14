"""
Agent Registry System
"""
from typing import Dict, Type, List
from decisionos.adapters.base_adapter import BaseAdapter

class AgentRegistry:
    _adapters: Dict[str, Type[BaseAdapter]] = {}

    @classmethod
    def register(cls, name: str):
        def decorator(adapter_cls: Type[BaseAdapter]):
            cls._adapters[name] = adapter_cls
            return adapter_cls
        return decorator

    @classmethod
    def list_available_agents(cls) -> List[str]:
        return list(cls._adapters.keys())

    @classmethod
    def get_agent(cls, name: str) -> BaseAdapter:
        if name not in cls._adapters:
            raise ValueError(f"Agent adapter '{name}' not found in registry.")
        return cls._adapters[name]()

    @classmethod
    def get_all_metadata(cls) -> List[Dict]:
        metadata_list = []
        for name, adapter_cls in cls._adapters.items():
            adapter = adapter_cls()
            metadata = adapter.get_agent_metadata()
            metadata["id"] = name  # Ensure ID is included
            metadata_list.append(metadata)
        return metadata_list
