/**
 * Client-side image compression utility.
 * Downsizes images that are unnecessarily large before they reach the server.
 */

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 to 1.0
}

/**
 * Compresses an image file and returns a new File object.
 * Senior Guard: Returns the original file after a 5s timeout to prevent hangs.
 */
export async function compressImage(file: File, options: CompressionOptions = {}): Promise<File> {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.8 } = options

  // Only compress images
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file
  }

  // Safety Timeout wrap
  return new Promise((resolve) => {
    // 5s Hard-stop to prevent "endless loading" on high-res photos
    const timeout = setTimeout(() => {
       console.warn(`[ImageOptimization] Timeout reached for ${file.name}. Proceeding with original.`)
       resolve(file)
    }, 5000)

    const reader = new FileReader()
    reader.readAsDataURL(file)
    
    reader.onerror = () => {
       clearTimeout(timeout)
       resolve(file)
    }

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      
      img.onerror = () => {
         clearTimeout(timeout)
         resolve(file)
      }

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          clearTimeout(timeout)
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            clearTimeout(timeout)
            if (!blob) {
              resolve(file)
              return
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            
            // Log optimization results
            const saved = ((file.size - compressedFile.size) / 1024).toFixed(1)
            console.log(`[ImageOptimization] Compressed ${file.name}: ${saved}KB saved.`)
            
            // Return whichever is smaller
            resolve(compressedFile.size < file.size ? compressedFile : file)
          },
          'image/jpeg',
          quality
        )
      }
    }
  })
}
