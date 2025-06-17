# Medical Transcription Assistant

A real-time medical transcription application that uses AWS services for speech-to-text, translation, and medical context analysis.

## Features

- Real-time speech-to-text transcription using Amazon Transcribe
- Multi-language support with Amazon Translate
- Medical context analysis using Amazon Bedrock (Claude)
- Modern, responsive UI built with Next.js and Tailwind CSS

## Prerequisites

- Node.js 18 or later
- AWS Account with access to:
  - Amazon Transcribe
  - Amazon Translate
  - Amazon Bedrock (with Claude model access)
- AWS credentials with appropriate permissions

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd medical-transcription-app
```

2. Install dependencies:
```bash
cd frontend
npm install
```

3. Create a `.env.local` file in the frontend directory with your AWS credentials:
```
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_AWS_ACCESS_KEY_ID=your_access_key_id
NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Select your target language from the dropdown menu
2. Click the "Start Recording" button to begin speaking
3. Speak clearly into your microphone
4. The application will:
   - Transcribe your speech in real-time
   - Translate the text if a different language is selected
   - Analyze the medical context using Claude
5. Click "Stop Recording" when finished

## Security Considerations

- Never commit your AWS credentials to version control
- Use appropriate IAM roles and permissions
- Consider implementing server-side token exchange for production use

## License

MIT 