const fs = require('fs');
const path = 'index.html';

try {
    const content = fs.readFileSync(path, 'utf8');
    const lines = content.split(/\r?\n/);

    // Index 640 corresponds to line 641 (1-based)
    const targetIndex = 640;

    console.log(`Original Line ${targetIndex + 1}:`, lines[targetIndex]);
    console.log('Original Char Codes:', lines[targetIndex].split('').map(c => c.charCodeAt(0)));

    // Explicitly construct the line with the microscope emoji
    // Microscope: 🔬 (U+1F52C)
    // We can use \uD83D\uDD2C in JS if needed, but literal should work in UTF8 source.
    lines[targetIndex] = '                            <text y=".98em" font-size="80">🔬</text>';

    console.log(`New Line ${targetIndex + 1}:`, lines[targetIndex]);
    console.log('New Char Codes:', lines[targetIndex].split('').map(c => c.charCodeAt(0)));

    const newContent = lines.join('\r\n');
    fs.writeFileSync(path, newContent, 'utf8');
    console.log('File written.');

    // Read back to verify
    const verifyContent = fs.readFileSync(path, 'utf8');
    const verifyLines = verifyContent.split(/\r?\n/);
    console.log(`Verified Line ${targetIndex + 1}:`, verifyLines[targetIndex]);

} catch (err) {
    console.error(err);
}
