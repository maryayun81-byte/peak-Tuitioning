export type HFImageResult = {
  dataUri: string
  model: string
  mimeType: string
}

const HUGGING_FACE_TOKEN = process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN
const HUGGING_FACE_IMAGE_BASE =
  process.env.HUGGINGFACE_IMAGE_ENDPOINT || 'https://router.huggingface.co/hf-inference/models'

const IMAGE_MODEL_CHAIN = [
  process.env.HF_LESSON_IMAGE_MODEL || 'black-forest-labs/FLUX.1-schnell',
  process.env.HF_LESSON_IMAGE_FALLBACK_MODEL || 'stabilityai/stable-diffusion-3.5-large',
  process.env.HF_LESSON_IMAGE_SECOND_FALLBACK_MODEL || 'runwayml/stable-diffusion-v1-5',
].filter(Boolean)

export function hasHuggingFaceImageToken() {
  return Boolean(HUGGING_FACE_TOKEN)
}

function normalizeImageBase(base: string) {
  return base.replace(/\/+$/, '')
}

export async function generateHuggingFaceLessonImage(prompt: string): Promise<HFImageResult> {
  if (!HUGGING_FACE_TOKEN) {
    throw new Error('Hugging Face token missing. Set HUGGINGFACE_API_TOKEN or HF_TOKEN.')
  }

  const errors: string[] = []

  for (const model of IMAGE_MODEL_CHAIN) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000) // Increased timeout for larger models

    try {
      const isFlux = model.includes('FLUX')
      
      const response = await fetch(`${normalizeImageBase(HUGGING_FACE_IMAGE_BASE)}/${model}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HUGGING_FACE_TOKEN}`,
          'Content-Type': 'application/json',
          // Use a very simple Accept header to avoid router rejection
          'Accept': 'image/png',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: 1024,
            height: 576,
            // Only add parameters that the specific model family supports
            ...(isFlux ? {
              num_inference_steps: 4,
            } : {
              num_inference_steps: 25,
              guidance_scale: 7.5,
              negative_prompt: 'blurry, low quality, unreadable text, tiny labels, watermark, logo, distorted diagram, photorealistic faces, clutter',
            }),
          },
          options: { 
            wait_for_model: true,
            use_cache: true 
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const contentType = response.headers.get('content-type') || 'image/png'
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => '')
        errors.push(`${model}:${response.status}:${errorText.replace(/\s+/g, ' ').slice(0, 150)}`)
        continue
      }

      // Handle JSON response (some models return base64 in JSON)
      if (contentType.includes('application/json')) {
        const data = await response.json().catch(() => ({}))
        if (typeof data?.image === 'string') {
          const mimeType = data.image.startsWith('/9j/') ? 'image/jpeg' : 'image/png'
          return {
            dataUri: data.image.startsWith('data:')
              ? data.image
              : `data:${mimeType};base64,${data.image}`,
            model,
            mimeType,
          }
        }
        if (data?.error) {
          errors.push(`${model}:${data.error}`)
          continue
        }
        errors.push(`${model}:json response returned instead of image`)
        continue
      }

      // Handle binary response
      const arrayBuffer = await response.arrayBuffer()
      const bytes = Buffer.from(arrayBuffer)
      
      if (bytes.length < 100) {
        errors.push(`${model}:response too small (${bytes.length} bytes)`)
        continue
      }

      const mimeType = contentType.includes('jpeg') || contentType.includes('jpg') ? 'image/jpeg' : 'image/png'

      return {
        dataUri: `data:${mimeType};base64,${bytes.toString('base64')}`,
        model,
        mimeType,
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      errors.push(`${model}:${error?.message || 'request failed'}`)
    }
  }

  throw new Error(`All Hugging Face image models failed (${errors.join('; ')})`)
}
