const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
// Removed Sharp dependency - using bundled ImageMagick for all image conversions
const { app } = require('electron');
const os = require('os');
const SettingsManager = require('./settings');

const execAsync = promisify(exec);

class FileConverter {
  constructor() {
    this.supportedFormats = {
      office: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
      images: ['.jpg', '.jpeg', '.png', '.tiff', '.tif', '.heic']
    };
    this.isWindows = process.platform === 'win32';
    this.settings = new SettingsManager();
    this.officeAvailable = null; // Cache Office availability check
  }

  async convertToPDF(inputPath, outputFolder) {
    const ext = path.extname(inputPath).toLowerCase();
    const basename = path.basename(inputPath, ext);
    const outputPath = path.join(outputFolder, `${basename}.pdf`);

    await fs.mkdir(outputFolder, { recursive: true });

    if (this.supportedFormats.office.includes(ext)) {
      return await this.convertOfficeToPDF(inputPath, outputPath);
    } else if (this.supportedFormats.images.includes(ext)) {
      return await this.convertImageToPDF(inputPath, outputPath);
    } else {
      throw new Error(`Unsupported file format: ${ext}. Supported formats: Office documents and images.`);
    }
  }

  async convertOfficeToPDF(inputPath, outputPath) {
    const conversionMethod = await this.settings.getSetting('officeConversionMethod');
    
    // Determine which method to use
    let useMethod = conversionMethod;
    if (conversionMethod === 'auto') {
      const hasOffice = await this.checkOfficeAvailability();
      useMethod = hasOffice ? 'native' : 'powershell';
    }
    
    try {
      if (useMethod === 'native' && this.isWindows) {
        return await this.convertOfficeViaCOM(inputPath, outputPath);
      } else if (useMethod === 'powershell' && this.isWindows) {
        return await this.convertOfficeViaPowerShell(inputPath, outputPath);
      } else {
        return await this.convertOfficeViaPowerShell(inputPath, outputPath);
      }
    } catch (error) {
      // If primary method fails, try fallback
      if (useMethod === 'native') {
        console.log('Native Office VBS failed, falling back to PowerShell...');
        return await this.convertOfficeViaPowerShell(inputPath, outputPath);
      } else {
        throw error;
      }
    }
  }

  async convertOfficeViaCOM(inputPath, outputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    
    try {
      if (['.doc', '.docx'].includes(ext)) {
        await this.convertWordToPDF(inputPath, outputPath);
      } else if (['.xls', '.xlsx'].includes(ext)) {
        await this.convertExcelToPDF(inputPath, outputPath);
      } else if (['.ppt', '.pptx'].includes(ext)) {
        await this.convertPowerPointToPDF(inputPath, outputPath);
      }
      return outputPath;
    } catch (error) {
      throw new Error(`Office conversion failed: ${error.message}. Ensure Microsoft Office is installed.`);
    }
  }

  async convertWordToPDF(inputPath, outputPath) {
    const vbsScript = `
      Set objWord = CreateObject("Word.Application")
      objWord.Visible = False
      objWord.DisplayAlerts = 0
      
      Set objDoc = objWord.Documents.Open("${inputPath.replace(/\\/g, '\\')}", False, True)
      objDoc.SaveAs2 "${outputPath.replace(/\\/g, '\\')}", 17
      objDoc.Close
      
      objWord.Quit
      Set objWord = Nothing
    `;
    
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `temp_word_script_${Date.now()}.vbs`);
    await fs.writeFile(scriptPath, vbsScript);
    
    try {
      await execAsync(`cscript //NoLogo "${scriptPath}"`);
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  async convertExcelToPDF(inputPath, outputPath) {
    const vbsScript = `
      Set objExcel = CreateObject("Excel.Application")
      objExcel.Visible = False
      objExcel.DisplayAlerts = False
      
      Set objWorkbook = objExcel.Workbooks.Open("${inputPath.replace(/\\/g, '\\\\')}", False, True)
      objWorkbook.ExportAsFixedFormat 0, "${outputPath.replace(/\\/g, '\\\\')}", 0, 1
      objWorkbook.Close
      
      objExcel.Quit
      Set objExcel = Nothing
    `;
    
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `temp_excel_script_${Date.now()}.vbs`);
    await fs.writeFile(scriptPath, vbsScript);
    
    try {
      await execAsync(`cscript //NoLogo "${scriptPath}"`);
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  async convertPowerPointToPDF(inputPath, outputPath) {
    const vbsScript = `
      Set objPPT = CreateObject("PowerPoint.Application")
      objPPT.Visible = False
      
      Set objPresentation = objPPT.Presentations.Open("${inputPath.replace(/\\/g, '\\')}", False, False, False)
      objPresentation.SaveAs "${outputPath.replace(/\\/g, '\\')}", 32
      objPresentation.Close
      
      objPPT.Quit
      Set objPPT = Nothing
    `;
    
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `temp_powerpoint_script_${Date.now()}.vbs`);
    await fs.writeFile(scriptPath, vbsScript);
    
    try {
      await execAsync(`cscript //NoLogo "${scriptPath}"`);
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  async checkOfficeAvailability() {
    if (this.officeAvailable !== null) {
      return this.officeAvailable;
    }
    
    if (!this.isWindows) {
      this.officeAvailable = false;
      return false;
    }
    
    try {
      // Try to create Word.Application COM object
      const testScript = `
        try {
          var word = new ActiveXObject("Word.Application");
          word.Quit();
          WScript.Echo("Available");
        } catch(e) {
          WScript.Echo("NotAvailable");
        }
      `;
      
      const tempDir = os.tmpdir();
      const scriptPath = path.join(tempDir, `office_check_${Date.now()}.js`);
      await fs.writeFile(scriptPath, testScript);
      
      try {
        const { stdout } = await execAsync(`cscript //NoLogo "${scriptPath}"`);
        this.officeAvailable = stdout.trim() === 'Available';
      } finally {
        await fs.unlink(scriptPath).catch(() => {});
      }
    } catch (error) {
      this.officeAvailable = false;
    }
    
    return this.officeAvailable;
  }
  
  async convertOfficeViaPowerShell(inputPath, outputPath) {
    const ext = path.extname(inputPath).toLowerCase();
    
    try {
      if (['.doc', '.docx'].includes(ext)) {
        await this.convertWordViaPowerShell(inputPath, outputPath);
      } else if (['.xls', '.xlsx'].includes(ext)) {
        await this.convertExcelViaPowerShell(inputPath, outputPath);
      } else if (['.ppt', '.pptx'].includes(ext)) {
        await this.convertPowerPointViaPowerShell(inputPath, outputPath);
      }
      return outputPath;
    } catch (error) {
      throw new Error(`PowerShell Office conversion failed: ${error.message}. Please ensure Microsoft Office is installed.`);
    }
  }

  async convertWordViaPowerShell(inputPath, outputPath) {
    const psScript = `
      $word = New-Object -ComObject Word.Application
      $word.Visible = $false
      $word.DisplayAlerts = 'wdAlertsNone'
      try {
        $doc = $word.Documents.Open('${inputPath.replace(/\\/g, '\\\\')}', $false, $true)
        $doc.SaveAs2('${outputPath.replace(/\\/g, '\\\\')}', 17)
        $doc.Close()
      } finally {
        $word.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
      }
    `;
    
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `temp_word_ps_${Date.now()}.ps1`);
    await fs.writeFile(scriptPath, psScript);
    
    try {
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  async convertExcelViaPowerShell(inputPath, outputPath) {
    const psScript = `
      $excel = New-Object -ComObject Excel.Application
      $excel.Visible = $false
      $excel.DisplayAlerts = $false
      try {
        $workbook = $excel.Workbooks.Open('${inputPath.replace(/\\/g, '\\\\')}', $false, $true)
        $workbook.ExportAsFixedFormat(0, '${outputPath.replace(/\\/g, '\\\\')}', 0, 1)
        $workbook.Close($false)
      } finally {
        $excel.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
      }
    `;
    
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `temp_excel_ps_${Date.now()}.ps1`);
    await fs.writeFile(scriptPath, psScript);
    
    try {
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }

  async convertPowerPointViaPowerShell(inputPath, outputPath) {
    const psScript = `
      $ppt = New-Object -ComObject PowerPoint.Application
      $ppt.Visible = 'msoFalse'
      try {
        $presentation = $ppt.Presentations.Open('${inputPath.replace(/\\/g, '\\\\')}', $false, $false, $false)
        $presentation.SaveAs('${outputPath.replace(/\\/g, '\\\\')}', 32)
        $presentation.Close()
      } finally {
        $ppt.Quit()
        [System.Runtime.Interopservices.Marshal]::ReleaseComObject($ppt) | Out-Null
      }
    `;
    
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `temp_powerpoint_ps_${Date.now()}.ps1`);
    await fs.writeFile(scriptPath, psScript);
    
    try {
      await execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    } finally {
      await fs.unlink(scriptPath).catch(() => {});
    }
  }
  
  async getConversionMethod() {
    const setting = await this.settings.getSetting('officeConversionMethod');
    if (setting === 'auto') {
      const hasOffice = await this.checkOfficeAvailability();
      return hasOffice ? 'Microsoft Office (VBS)' : 'Microsoft Office (PowerShell)';
    }
    if (setting === 'native') {
      return 'Microsoft Office (VBS)';
    } else if (setting === 'powershell') {
      return 'Microsoft Office (PowerShell)';
    }
    return 'Microsoft Office (Auto)';
  }

  async convertImageToPDF(inputPath, outputPath) {
    // Use bundled ImageMagick for all image conversions (handles all formats including HEIC 4.3000+ codecs)
    return await this.convertImageViaImageMagick(inputPath, outputPath);
  }


  async convertImageViaImageMagick(inputPath, outputPath) {
    // Use bundled ImageMagick 7.1.2+ for robust image conversion (excellent HEIC support including 4.3000+ codecs)
    const tempDir = os.tmpdir();
    const tempPngPath = path.join(tempDir, `temp_magick_${Date.now()}.png`);

    try {
      // Get the bundled ImageMagick path
      const bundledMagickPath = path.join(process.resourcesPath, 'ImageMagick', 'magick.exe');

      // Use only the bundled ImageMagick
      try {
        await execAsync(`"${bundledMagickPath}" "${inputPath}" "${tempPngPath}"`);
      } catch (error) {
        throw new Error(`Bundled ImageMagick failed. This may indicate a corrupted installation or unsupported file format. Error: ${error.message}`);
      }

      // Check if PNG was created successfully
      try {
        await fs.access(tempPngPath);
      } catch {
        throw new Error('ImageMagick conversion failed - no output file created');
      }

      // Convert the PNG to PDF
      const pngBuffer = await fs.readFile(tempPngPath);

      const { PDFDocument } = require('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      // Add metadata
      pdfDoc.setTitle(path.basename(inputPath, path.extname(inputPath)));
      pdfDoc.setSubject('Image converted to PDF via ImageMagick');
      pdfDoc.setCreator('The Printing Press File Converter');
      pdfDoc.setProducer('The Printing Press File Converter v1.1.0');
      pdfDoc.setCreationDate(new Date());
      pdfDoc.setModificationDate(new Date());

      const page = pdfDoc.addPage([595, 842]);
      const pngImage = await pdfDoc.embedPng(pngBuffer);

      // Calculate scaling to fit within page margins
      const imgWidth = pngImage.width;
      const imgHeight = pngImage.height;
      const maxWidth = 555; // 595 - 40 margins
      const maxHeight = 802; // 842 - 40 margins

      let finalWidth = imgWidth;
      let finalHeight = imgHeight;

      if (imgWidth > maxWidth || imgHeight > maxHeight) {
        const widthRatio = maxWidth / imgWidth;
        const heightRatio = maxHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);

        finalWidth = imgWidth * ratio;
        finalHeight = imgHeight * ratio;
      }

      const x = (595 - finalWidth) / 2;
      const y = (842 - finalHeight) / 2;

      page.drawImage(pngImage, {
        x: x,
        y: y,
        width: finalWidth,
        height: finalHeight
      });

      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false
      });
      await fs.writeFile(outputPath, pdfBytes);

      return outputPath;
    } finally {
      // Clean up temp file
      await fs.unlink(tempPngPath).catch(() => {});
    }
  }


  getFileType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (this.supportedFormats.office.includes(ext)) {
      return 'office';
    } else if (this.supportedFormats.images.includes(ext)) {
      return 'image';
    }
    return 'unknown';
  }

  isSupported(filePath) {
    return this.getFileType(filePath) !== 'unknown';
  }

  async mergePDFs(pdfPaths, outputPath) {
    try {
      const { PDFDocument } = require('pdf-lib');
      const mergedPdf = await PDFDocument.create();
      
      // Add metadata for merged document
      mergedPdf.setTitle('Merged Documents');
      mergedPdf.setSubject('Multiple PDFs merged into one document');
      mergedPdf.setCreator('The Printing Press File Converter');
      mergedPdf.setProducer('The Printing Press File Converter v1.0.0');
      mergedPdf.setCreationDate(new Date());
      mergedPdf.setModificationDate(new Date());

      for (const pdfPath of pdfPaths) {
        const pdfBytes = await fs.readFile(pdfPath);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const pdfBytes = await mergedPdf.save({
        useObjectStreams: false,
        addDefaultPage: false
      });
      
      await fs.writeFile(outputPath, pdfBytes);
      return outputPath;
    } catch (error) {
      throw new Error(`PDF merge failed: ${error.message}`);
    }
  }
}

module.exports = FileConverter;