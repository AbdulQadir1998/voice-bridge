### 🌍 Live Audio Translation & Speech Synthesis

### Purpose
This project provides real-time audio translation from any spoken language to any other language. It listens to a live audio stream, transcribes it using Deepgram, translates the text using DeepL, and finally converts the translated text into speech using OpenAI's text-to-speech (TTS) engine. This enables live multilingual communication in both text and audio form.

### 🚀 Features

- 🎧 Live audio streaming from any valid URL
- 🧠 Real-time transcription using Deepgram
- 🌐 Language translation using DeepL
- 🔊 Speech synthesis of translated text using OpenAI TTS
- 🛠 Built with Node.js and Express

### 🛠 Technologies Used

- Deepgram – Live transcription of audio
- DeepL – Language translation
- OpenAI – Text-to-Speech generation
- Express.js – Web server framework
- cross-fetch – Stream fetching
- dotenv – Environment variable management

### 📦 Installation

#### Clone the repository
```
git clone https://github.com/your-username/live-audio-translator.git
cd live-audio-translator
```

#### Install dependencies
```
npm install
```

Configure environment variables

Create a .env file in the root directory and add:
```
DEEPGRAM_API_KEY=your_deepgram_api_key
DEEPL_API_KEY=your_deepl_api_key
OPENAI_API_KEY=your_openai_api_key
```

### ▶️ Usage
Start the server:
```
node index.js
```

- Make a GET request to /live-audio with the following optional query parameters:
- streamURL: URL of a live audio stream (e.g., a radio stream)
- lang: Target language code for translation (e.g., FR, DE, JA)
- streamLang: Source language code for transcription (e.g., EN-US, DE, FR)

#### Example
```
http://localhost:3000/live-audio?streamURL=http://stream.live.vc.bbcmedia.co.uk/bbc_world_service&lang=FR&streamLang=EN-US
```

