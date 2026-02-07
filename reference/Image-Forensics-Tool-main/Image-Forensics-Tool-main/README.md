
# 🔍 Advanced Image Forensics Tool

A professional-grade, fully static web application for comprehensive image analysis and digital forensics. This tool provides advanced features for detecting image manipulation, steganography, deepfakes, and various forms of digital forgery.

## 🌐 Live Demo

**[Try it live here](https://0x0806.github.io/Image-Forensics-Tool/)**

## ✨ Features

### 📊 **Metadata Analysis**
- Complete EXIF data extraction and analysis
- Detection of editing software traces
- GPS location data extraction
- Timestamp verification
- Warning system for suspicious metadata

### 📈 **Histogram Analysis**
- RGB channel histogram visualization
- Luminance analysis
- Statistical calculations (mean, standard deviation)
- Interactive channel toggling
- Anomaly detection in color distributions

### ⚡ **Error Level Analysis (ELA)**
- Configurable JPEG quality levels
- Visual difference highlighting
- Compression artifact detection
- Manipulation probability scoring
- Side-by-side comparison views

### 🔐 **Steganography Detection**
- **LSB Analysis**: Least Significant Bit pattern detection
- **Chi-Square Test**: Statistical analysis for hidden data
- **Bit Plane Analysis**: Visual representation of all 8 bit planes
- Randomness scoring and interpretation

### 🗜️ **Compression Analysis**
- JPEG quality estimation
- DCT block grid visualization
- Double compression detection
- Artifact pattern analysis

### 🔄 **Similarity & Reverse Search**
- **Perceptual Hashing**: aHash, dHash, pHash generation
- **Image Comparison**: Structural and color similarity
- **Duplicate Detection**: Find related images
- Hash-based matching algorithms

### 🤖 **Deepfake Detection**
- **AI Generation Analysis**: Neural network artifact detection
- **GAN Detection**: Generative model fingerprinting
- **Frequency Analysis**: FFT-based anomaly detection
- **Texture Consistency**: Pattern irregularity detection

### ✂️ **Splice Detection**
- **Illumination Analysis**: Lighting consistency verification
- **Edge Pattern Analysis**: Boundary irregularity detection
- **Shadow Vector Analysis**: Light source verification
- Multi-region comparison algorithms

### 📋 **Copy-Move Forgery Detection**
- **Keypoint Matching**: SIFT-like duplicate region detection
- **Block Matching**: Configurable block size analysis
- **Visual Highlighting**: Color-coded match visualization
- Similarity threshold configuration

### 🌍 **Geolocation Verification**
- **Shadow Analysis**: Solar angle calculations
- **Weather Consistency**: Historical weather verification
- **Landmark Detection**: Architectural element recognition
- **Metadata Cross-reference**: Location data validation

### 📊 **Noise Analysis**
- **Sensor Noise Pattern**: Camera fingerprinting
- **PRNU Analysis**: Photo Response Non-uniformity detection
- **Camera Identification**: Device-specific signatures
- **Noise Level Assessment**: Quality metrics

### 📤 **Export & Reporting**
- **JSON Export**: Complete analysis data
- **HTML Reports**: Professional formatted reports
- **PDF Generation**: Print-ready documentation
- **Batch Processing**: Multiple image analysis

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No installation required - fully client-side processing

### Usage

1. **Upload Images**: Drag and drop or click to select image files
2. **Select Analysis**: Choose from 11 different forensic analysis tabs
3. **Configure Parameters**: Adjust settings for specific analyses
4. **Review Results**: Examine detailed findings and visualizations
5. **Export Reports**: Download comprehensive analysis reports

### Supported Formats
- JPEG/JPG
- PNG
- GIF
- WebP
- TIFF
- BMP

## 🛠️ Technical Implementation

### Architecture
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Processing**: Client-side image analysis algorithms
- **Visualization**: HTML5 Canvas API
- **Security**: No server communication - all processing local

### Key Algorithms
- **Sobel Edge Detection**: For edge consistency analysis
- **DCT Analysis**: JPEG compression assessment
- **Perceptual Hashing**: Image similarity detection
- **Statistical Analysis**: Chi-square testing for steganography
- **Frequency Domain Analysis**: FFT-based artifact detection

### Performance
- Real-time processing for most analyses
- Optimized algorithms for web browsers
- Progressive loading for large images
- Memory-efficient batch processing

## 🔧 Advanced Features

### Batch Analysis
Process multiple images simultaneously with comparative analysis across the entire dataset.

### Custom Thresholds
Adjust sensitivity levels for different detection algorithms based on specific use cases.

### Professional Reporting
Generate court-ready reports with detailed methodology and findings documentation.

### Cross-Platform Compatibility
Works seamlessly across all modern devices and operating systems.

## 🎯 Use Cases

- **Digital Forensics**: Law enforcement investigations
- **Media Verification**: Journalism and fact-checking
- **Academic Research**: Computer vision and security research
- **Content Authentication**: Social media platform verification
- **Legal Evidence**: Court admissible image analysis
- **Security Auditing**: Corporate image asset verification

## 🔒 Privacy & Security

- **No Data Upload**: All processing happens locally in your browser
- **Privacy First**: No tracking, analytics, or data collection
- **Secure Processing**: Images never leave your device
- **Open Source**: Transparent algorithms and implementation

## 📱 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 60+ | ✅ Full Support |
| Firefox | 55+ | ✅ Full Support |
| Safari | 12+ | ✅ Full Support |
| Edge | 79+ | ✅ Full Support |

## 🤝 Contributing

This tool is actively maintained and enhanced. For feature requests, bug reports, or contributions, please contact the developer.

## 📄 License

This project is developed for educational and professional forensic analysis purposes.

## 👨‍💻 Developer

**Developed by 0x0806**

- Advanced computer vision algorithms
- Digital forensics expertise
- Web security implementations
- Image processing optimization

## 🔗 Links

- **Live Demo**: [https://0x0806.github.io/Image-Forensics-Tool/](https://0x0806.github.io/Image-Forensics-Tool/)
- **Documentation**: Comprehensive in-app help and tooltips
- **Updates**: Regular feature additions and algorithm improvements

## 📊 Statistics

- **11+ Analysis Types**: Comprehensive forensic coverage
- **50+ Detection Algorithms**: Professional-grade accuracy
- **Real-time Processing**: Instant results for most analyses
- **Cross-platform**: Works on any modern device

---

**⚠️ Disclaimer**: This tool is designed for legitimate forensic analysis, research, and educational purposes. Users are responsible for ensuring compliance with applicable laws and regulations when analyzing images.

**🔍 Professional Note**: While this tool provides sophisticated analysis capabilities, complex forensic investigations may require additional specialized software and expert interpretation of results.
