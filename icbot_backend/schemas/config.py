from pydantic import BaseModel  # Defines API config schema.


class FeatureFlagsModel(BaseModel):  # Represents feature toggles exposed to clients.
    auto_candidate_reply: bool
