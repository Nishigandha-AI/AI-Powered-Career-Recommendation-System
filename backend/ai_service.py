# """LLM service wrapper used for AI-generated career insights and chat."""
# import os
# import uuid
# from emergentintegrations.llm.chat import LlmChat, UserMessage

# LLM_MODEL = ("anthropic", "claude-sonnet-4-5-20250929")


# async def llm_call(system: str, prompt: str, session_id: str = None) -> str:
#     chat = LlmChat(
#         api_key=os.environ["LLM_API_KEY"],
#         session_id=session_id or str(uuid.uuid4()),
#         system_message=system,
#     ).with_model(*LLM_MODEL)
#     res = await chat.send_message(UserMessage(text=prompt))
#     return res if isinstance(res, str) else str(res)


"""LLM service wrapper used for AI-generated career insights and chat."""
import os
import anthropic

LLM_MODEL = "claude-sonnet-4-6"


async def llm_call(system: str, prompt: str, session_id: str = None) -> str:
    client = anthropic.AsyncAnthropic(api_key=os.environ["LLM_API_KEY"])
    message = await client.messages.create(
        model=LLM_MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text