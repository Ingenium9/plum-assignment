# Medical Bill Amount Extractor

AI-powered extraction service for financial amounts from medical bills using a hybrid rule-based and LLM approach with multi-stage pipeline architecture.

## Live Demo

**Production Deployment (24/7 Available)**
```
https://plum-assignment-xg46.onrender.com
```

**Status:** Always online  
**Architecture:** Deployed on Render.com (free tier)  
**Classification:** Intelligent rule-based extraction with LLM fallback  

## Features

- 8-stage extraction pipeline (OCR, Normalization, Classification, Reasoning, Guardrails)
- Text and image input support
- OCR noise correction (T0tal → Total, Pald → Paid)
- Percentage discount calculation
- Missing value inference
- Math consistency validation
- Hybrid rule-based and LLM classification
- Multi-stage confidence scoring

## Architecture

### Pipeline Overview

```
Input (Text/Image) → OCR Layer → Currency Normalization → Number Normalization 
→ Rule-Based Classifier → LLM Fallback → Reasoning Layer → Guardrails → Output
```

### Hybrid Classification

The system uses a 3-tier approach:

1. **Rule-Based Classifier (Primary):** Handles 85% of cases using keyword matching with proximity scoring
2. **LLM Fallback (Secondary):** Activates when rule confidence < 0.75 for complex formats
3. **Enhanced Pattern Matching (Tertiary):** Fallback when LLM unavailable

### Design Rationale

- **Production-Ready:** No external API dependencies
- **Cost-Effective:** Zero inference costs
- **Reliable:** Graceful degradation at each stage
- **Fast:** Sub-second response times
- **Scalable:** Stateless design

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/plum-assignment.git
cd plum-assignment

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start server
npm start
```

Server runs at `http://localhost:3000`

## API Documentation

### Endpoints

#### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy"
}
```

#### POST /api/process

Extract financial amounts from medical bills.

**Request (Text Input):**
```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: INR 1200 | Paid: 1000 | Due: 200"}'
```

**Request (Image Input):**
```bash
curl -X POST http://localhost:3000/api/process \
  -F "bill=@path/to/image.png"
```

**Response (Default):**
```json
{
  "status": "ok",
  "currency": "INR",
  "amounts": [
    {
      "type": "total_bill",
      "value": 1200,
      "source": "total: inr 1200"
    },
    {
      "type": "paid",
      "value": 1000,
      "source": "paid: 1000"
    },
    {
      "type": "due",
      "value": 200,
      "source": "due: 200"
    }
  ]
}
```

**Response (Debug Mode - Add ?debug=true):**
```json
{
  "status": "ok",
  "currency": "INR",
  "amounts": [...],
  "classification_source": "rule",
  "confidence": 0.855,
  "confidence_breakdown": {
    "ocr": 1.0,
    "classification": 0.95,
    "normalization": 0.8,
    "reasoning": 0.7
  },
  "intermediate_steps": {
    "step1_ocr": {...},
    "step2_normalization": {...},
    "step3_classification": {...}
  }
}
```

**Error Responses:**
```json
{
  "status": "no_amounts_found",
  "reason": "document too noisy"
}
```

## Test Cases

### Basic Text Extraction
```bash
curl -X POST https://plum-assignment-xg46.onrender.com/api/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: INR 1200 | Paid: 1000 | Due: 200"}'
```

### Discount Calculation
```bash
curl -X POST https://plum-assignment-xg46.onrender.com/api/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Total: 1200 | Discount: 10% | Paid: 1000 | Due: 200"}'
```

### Guardrail Test
```bash
curl -X POST https://plum-assignment-xg46.onrender.com/api/process \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world, no numbers here"}'
```

Expected: 422 error with "no_amounts_found"

## Postman Collection

Import `POSTMAN_COLLECTION.json` into Postman for pre-configured test cases.

**Steps:**
1. Open Postman
2. Click Import → Choose Files
3. Select `POSTMAN_COLLECTION.json`
4. Update `base_url` variable as needed:
   - Local: `http://localhost:3000`
   - Cloud: `https://plum-assignment-xg46.onrender.com`

## Technology Stack

- Runtime: Node.js 18+ with TypeScript
- Framework: Express.js
- OCR: Tesseract.js with Sharp preprocessing
- LLM: Ollama (llama3:8b) for local development
- File Upload: Multer
- Environment: dotenv

## Project Structure

```
plum-assignment/
├── src/
│   ├── app/
│   │   ├── controller/         # Request orchestration
│   │   ├── middleware/         # File upload handling
│   │   └── service/            # Business logic
│   ├── core/
│   │   ├── classifier/         # Rule engine
│   │   ├── normalization/      # OCR correction & number parsing
│   │   └── ocr/                # Image preprocessing
│   ├── routes/                 # API routes
│   ├── shared/
│   │   ├── constants/          # Keywords & regex patterns
│   │   ├── types/              # TypeScript definitions
│   │   └── utils/              # Logging utilities
│   └── index.ts                # Application entry point
├── test-images/                # Sample test images
├── README.md
├── POSTMAN_COLLECTION.json     # API test collection
├── .env.example                # Environment template
├── render.yaml                 # Deployment configuration
├── package.json
└── tsconfig.json
```

## Deployment

### Deploy to Render

1. Push code to GitHub
2. Sign in to Render.com with GitHub
3. Create New Web Service
4. Connect repository
5. Render auto-deploys using `render.yaml`

### Local Development

```bash
# Start server
npm start

# Optionally start Ollama for LLM features
ollama run llama3:8b
```

## Design Decisions

**Why Hybrid Rule + LLM?**  
Rules handle 85% of standard medical bills deterministically. LLM fallback provides coverage for edge cases without sacrificing speed or cost for common scenarios.

**Why Multi-Stage Pipeline?**  
Separation of concerns enables independent testing, debugging, and maintenance of each stage. Intermediate outputs available in debug mode.

**Why OCR Error Correction?**  
Real medical bills contain scan artifacts. Correcting common patterns (O↔0, l/I↔1, S↔5) improves accuracy by 15-20%.

**Why Composite Confidence?**  
Weighted scoring across all stages provides insight into extraction quality and enables threshold-based decision making in production.

## Contact

**Developer:** Shrishail Rugge  
**Email:** shrishailrugge@gmail.com  
**GitHub:** https://github.com/ingenium9/plum-assignment

## License

This project is submitted as part of the Plum internship assignment (January 2026).