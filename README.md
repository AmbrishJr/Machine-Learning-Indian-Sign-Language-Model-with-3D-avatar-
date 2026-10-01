# Sign Kit: An Avatar-based ISL Toolkit

## Overview 
Sign Kit is a comprehensive web application designed to bridge the communication gap between the hearing and deaf communities through Indian Sign Language (ISL). The platform converts speech and text into animated ISL gestures using a 3D avatar, making digital content more accessible to the deaf community.

## 🌟 Features

- **Real-time Translation**: Convert text and speech to Indian Sign Language
- **Interactive Learning**: Learn ISL through guided lessons and practice
- **Video Creation**: Create and share ISL videos
- **User-friendly Interface**: Intuitive design with dark/light mode support
- **Responsive Design**: Works seamlessly across all devices

## 🛠 Tech Stack

### Frontend
- **Framework**: React.js with React Router
- **State Management**: React Hooks (useState, useEffect)
- **Styling**: Bootstrap 5, Custom CSS
- **Icons**: Font Awesome
- **3D Rendering**: Three.js
- **Build Tool**: Webpack (via Create React App)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (MongoDB Atlas)
- **Authentication**: JWT (JSON Web Tokens)

### Avatar Technology
- **3D Modeling**: Custom rigged 3D character
- **Animation**: Skeletal animation system
- **Sign Language Generation**: skeletal keyframes on a single Mixamo-rigged avatar, whose look can be customised in the **Avatar Studio** page (`/sign-kit/avatar`). The original signs (HOME, PERSON, TIME, YOU, A–Z) are hand-made. The other 16 word signs (greetings and pronouns) were **extracted from real ISL videos** with MediaPipe; see [`tools/sign-extractor`](tools/sign-extractor/README.md).

### Translation Pipeline (`client/src/Translation/`)
1. **English → ISL gloss (NLP)**: POS tagging and lemmatisation with [compromise](https://github.com/spencermountain/compromise), then ISL grammar rules: drop articles and copulas, time markers first, verb last (SOV), negation after the verb, question words at the end. Example: *"I am not going to the market tomorrow"* → `TOMORROW I MARKET GO NOT`.
2. **Sign lookup**: fixed expressions first (*thank you*, *how are you*, *good morning*…), then an exact sign, then a curated synonym, then the **ML semantic matcher** ([all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2) sentence embeddings, cosine similarity ≥ 0.55, content words only), e.g. *house* → HOME, *lady* → PERSON. Anything else is fingerspelled.
3. **Speech**: the browser Web Speech API, or **Whisper** ([whisper-base.en](https://huggingface.co/onnx-community/whisper-base.en)) running on-device.

Both ML models run in the browser via [transformers.js](https://github.com/huggingface/transformers.js) in Web Workers (`client/public/ml/`). They are downloaded from the Hugging Face Hub on first use (~25 MB and ~80 MB) and cached by the browser.
- **Rendering**: WebGL for smooth 3D visualization

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AmbrishJr/ISL-APP-WITH-3D-AVATAR-.git
   ```

2. **Navigate to the project directory**
   ```bash
   cd ISL-APP-WITH-3D-AVATAR-
   ```

3. **Install dependencies**
   ```bash
   cd client
   npm install
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open in browser**
   The application will be available at `http://localhost:3000`

### Branches
- `main`: Contains the React-based client application
- `api`: Contains the Node.js backend API

## 📊 Performance Metrics
- User Satisfaction: 4.44/5
- Net Promoter Score (NPS): +36
- System Usability Scale (SUS): 81.5
- Appearance Rating: 4.52/5
- Overall Rating: 4.32/5
- Word Error Rate (WER): 6.39%
- Animation Similarity Score: 4.87/5

## 👥 Contributors
- Ambrish.S (Chennai Institiute of Technology)
- Muthu Kumaran.M (Chennai Institiute of Technology)

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
