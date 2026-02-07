# ForensicX - Advanced Image Forensics Suite

![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
![Version](https://img.shields.io/badge/Version-2.1-green.svg)
![Status](https://img.shields.io/badge/Status-Active-success.svg)

**ForensicX** is a powerful, client-side digital forensics laboratory designed for analyzing, verifying, and uncovering hidden details in images. Built with modern web technologies, it offers a professional suite of tools to detect manipulation, extract metadata, and analyze compression artifacts without ever sending your sensitive files to a server.

## 🚀 Key Features

### 🔍 Deep Analysis Tools
*   **Error Level Analysis (ELA):** Detect manipulated areas by analyzing compression rate differences. Customizable JPEG quality levels.
*   **Deepfake / AI Detection:** Analyzes noise patterns, color diversity, and metadata anomalies to estimate the likelihood of AI generation.
*   **Clone & Splice Detection:** Identifies copy-move attacks and spliced regions within an image.
*   **Magic Lens (HUD):** A real-time loupe with a Heads-Up Display showing 5x magnification, precise RGB values, hex codes, and coordinate tracking.

### 📊 Metadata & Files
*   **EXIF Data Extraction:** View detailed camera settings, GPS coordinates, and timeline data.
*   **File Signature Analysis:** Verify true file types based on hex signatures (magic bytes).
*   **Hash Generation:** Securely generate MD5, SHA-1, and SHA-256 hashes for evidence integrity.

### 📉 Signal & Noise
*   **Histogram Analysis:** Visualize color distribution to detect clipping and gamma correction.
*   **Noise Analysis:** Check for noise consistencies to spot foreign elements.
*   **FFT Frequency Analysis:** Transform images to frequency domain to spot periodic patterns and edits.

### 🛡️ Privacy & Security
*   **100% Client-Side:** All analysis happens directly in your browser. No images are uploaded to any external server, ensuring complete data privacy.
*   **Secure Reports:** Generate and export detailed PDF reports of your findings directly from the browser.

## 🛠️ Technology Stack
*   **Core:** HTML5, CSS3 (Modern Grid/Flexbox), Vanilla JavaScript (ES6+)
*   **Libraries:** 
    *   `jspdf` (Report Generation)
    *   `exif-js` (Metadata Parsing)
*   **Design:** Custom Dark/Light Theming, Responsive Layout (Mobile/Desktop), Glassmorphism UI.

## 📦 Installation & Usage

Since ForensicX is client-side, you can simply serve the files statically.

### 1. Clone the Repository
```bash
git clone https://github.com/John-Varghese-EH/Image-Forensics.git
cd Image-Forensics
```

### 2. Run Locally
You can use any static file server. For example:

**Using Python:**
```bash
python -m http.server 8000
# Open http://localhost:8000 in your browser
```

**Using Node (npx):**
```bash
npx serve .
# Open the provided localhost URL
```

**Using VS Code:**
*   Install the "Live Server" extension.
*   Right-click `index.html` and select "Open with Live Server".

## 📱 Mobile Support
ForensicX includes a fully responsive design:
*   **Mobile-First Layout:** Analysis panels stack seamlessly below content on small screens.
*   **Touch Optimizations:** Smooth scrolling and touch-friendly controls.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

Distributed under the **Apache License 2.0**. See [LICENSE](LICENSE) for more information.

## 📬 Contact

**John Varghese**  
GitHub: [@John-Varghese-EH](https://github.com/John-Varghese-EH)  
Instagram: [@cyber__trinity](https://instagram.com/cyber__trinity)
