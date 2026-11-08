# MediaPipe Selfie Segmenter model attribution

- File: selfie_segmenter.tflite (float16 person/background segmentation).
- Source: Google AI Edge MediaPipe Models.
- Original distribution:
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite
- Model card:
  https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Selfie%20Segmentation.pdf
- License: Apache License, Version 2.0.
  https://www.apache.org/licenses/LICENSE-2.0
- Model authors: Tingbo Hou, Siargy Pisarchyk, Karthik Raveendran (Google).
- Downloaded for locally served background-segmentation inference in the delegate portrait editor.

The model and JS/WASM runtime are used on the client; portrait source images are
not sent to Google or a hosted background-removal API.
