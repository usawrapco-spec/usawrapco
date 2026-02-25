import gradio as gr
import xai_sdk
import base64
from io import BytesIO
import os

api_key = os.getenv("XAI_API_KEY")
if not api_key:
    raise ValueError("Set XAI_API_KEY first")

client = xai_sdk.Client(api_key=api_key)

def generate_mockup(vehicle_img, wrap_desc):
    if not vehicle_img: return None, "Upload photo"
    if not wrap_desc: return None, "Enter description"
    try:
        buffered = BytesIO()
        vehicle_img.save(buffered, format="JPEG")
        img_b64 = base64.b64encode(buffered.getvalue()).decode()
        image_url = f"data:image/jpeg;base64,{img_b64}"
        prompt = f"Apply wrap exactly: {wrap_desc}. Photorealistic mockup. Match lighting, angle, perspective. No vehicle changes."
        response = client.image.sample(prompt=prompt, model="grok-imagine-image", image_url=image_url)
        return response.url, "Done"
    except Exception as e:
        return None, f"Error: {str(e)}"

gr.Interface(
    fn=generate_mockup,
    inputs=[gr.Image(type="pil", label="Vehicle photo"), gr.Textbox(label="Wrap description", placeholder="matte black with red flames")],
    outputs=[gr.Image(label="Mockup"), gr.Textbox(label="Status")],
    title="USA Wrap Co - Grok AI Mockups",
    description="Live AI wrap previews"
).launch(share=True)
