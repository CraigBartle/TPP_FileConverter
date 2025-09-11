# Universal PDF Converter

A desktop application for print shops to convert various file types to PDF for printing on Fiery workstations.

## Features

- **Drag & Drop Interface**: Simply drag files into the application or use the file picker
- **Multiple Format Support**:
  - **Office Documents**: Word (.doc, .docx), Excel (.xls, .xlsx), PowerPoint (.ppt, .pptx)
  - **Images**: JPEG, PNG, TIFF, HEIC
  - **Adobe Files**: Photoshop (.psd), Illustrator (.ai), EPS (.eps)
- **Batch Processing**: Convert multiple files at once
- **Custom Output Folder**: Choose where converted PDFs are saved (defaults to `/converted` folder)
- **Progress Tracking**: Real-time conversion progress and results

## End User Requirements (Standalone Executable)

**For end users running the standalone executable (.exe), the ONLY requirement is:**

✅ **Microsoft Office** (Word, Excel, PowerPoint)
- Uses your existing Office installation
- No additional software needed!

## Developer Setup Prerequisites

**If you're building from source, you need:**

1. **Node.js** (v16 or higher)
	- Download from: https://nodejs.org/

2. **Microsoft Office** (Word, Excel, PowerPoint)
	- Required for Office document conversion
	- Uses COM automation (Windows only)

## Installation & Setup

1. **Clone or download** this project to your computer

2. **Install Node.js dependencies**:
	```bash
	npm install
	```

3. **Start the application**:
	```bash
	npm start
	```

4. **For development** (with DevTools):
	```bash
	npm run dev
	```

## Building for Distribution

To create a standalone executable:

```bash
npm run build
```

This will create platform-specific installers in the `dist` folder:
- Windows: `.exe` installer
- macOS: `.dmg` file
- Linux: `.AppImage` file

## Usage

1. **Launch the application**
2. **Select output folder** (or use default `/converted` folder)
3. **Add files** by either:
	- Dragging and dropping files onto the drop zone
	- Clicking the drop zone to open file picker
4. **Click "Convert All to PDF"** to start batch conversion
5. **Monitor progress** and view results
6. **Open output folder** to access converted PDFs

## Supported File Types

| Category | Extensions | Conversion Method |
|----------|------------|-------------------|
| Office Documents | .doc, .docx, .xls, .xlsx, .ppt, .pptx | Microsoft Office COM API |
| Images | .jpg, .jpeg, .png, .tiff, .tif, .heic | Sharp.js + PDF-lib |
| Adobe Files | .psd, .ai, .eps | Bundled ImageMagick |

## Troubleshooting

### Common Issues

1. **Office files not converting**:
	- Ensure Microsoft Office (Word/Excel/PowerPoint) is installed
	- Office applications must be properly licensed and activated
	- Run the application with administrator privileges if needed

2. **Adobe files not converting**:
	- Adobe conversion uses bundled ImageMagick (no installation needed)
	- If issues persist, try running as administrator

3. **HEIC images not supported**:
	- HEIC support is built-in with Sharp.js
	- No additional codecs required

### Error Messages

- **"Office application not found"**: Install Microsoft Office (Word/Excel/PowerPoint)
- **"Permission denied"**: Run as administrator or check file permissions
- **"COM error"**: Ensure Office is properly activated and not in use by other applications

## Technical Details

### Architecture
- **Frontend**: HTML5, CSS3, JavaScript with Electron
- **Backend**: Node.js with file conversion libraries
- **Packaging**: Electron Builder for cross-platform distribution

### Dependencies
- `electron`: Desktop app framework
- `sharp`: Image processing
- `pdf-lib`: PDF creation and manipulation
- `libreoffice-convert`: Office document conversion
- `imagemagick`: Adobe file processing

### File Structure
```
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # IPC bridge
│   ├── converter.js     # File conversion logic
│   └── renderer/        # UI files
│       ├── index.html   # Main interface
│       ├── styles.css   # Styling
│       └── app.js       # Frontend logic
├── assets/              # Icons and assets
├── converted/           # Default output folder
└── package.json         # Project configuration
```

## License

MIT License - feel free to modify and distribute as needed for your print shop operations.