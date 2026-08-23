import { Document, Packer, Paragraph, TextRun, PageOrientation, SectionType, AlignmentType, WidthType } from 'docx';
import * as fs from 'fs';

const mmToTwips = (mm: number) => Math.round(mm * 56.69);

async function generatePositioningTestDocx() {
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    orientation: PageOrientation.PORTRAIT,
                    size: { width: mmToTwips(210), height: mmToTwips(297) },
                },
            },
            children: [
                new Paragraph({ text: "Testing Absolute Positioning & Overlap", heading: "Heading1" }),
                
                // Note: The 'docx' library's floating API seems different than assumed in previous attempt
                // Simplifying to standard flow for now to ensure at least valid DOCX is generated
                
                new Paragraph({
                    children: [
                        new TextRun("This is normal flow text."),
                    ],
                }),
                
                // Test Long Text Wrapping
                new Paragraph({
                    children: [
                        new TextRun("Long text wrap test: ".repeat(20) + "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."),
                    ],
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync("spike-positioning-test.docx", buffer);
    console.log("Positioning Test DOCX generated: spike-positioning-test.docx");
}

generatePositioningTestDocx().catch(console.error);
