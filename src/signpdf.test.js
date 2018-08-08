import signpdf from './signpdf';
import PDFDocument from 'pdfkit';

/**
 * Adds the objects that are needed for Adobe.PPKLite to read the signature.
 * Also includes a placeholder for the actual signature.
 * Returns an Object with all the added PDFReferences.
 * @param {PDFDocument} pdf 
 * @param {string} reason 
 * @returns {object}
 */
const addSignaturePlaceholder = (pdf, reason) => {
    // Generate the signature placeholder
    const signature = pdf.ref({
        Type: 'Sig',
        Filter: 'Adobe.PPKLite',
        SubFilter: 'adbe.pkcs7.detached',
        ByteRange: [
            0,
            signpdf.BYTERANGE_PLACEHOLDER,
            signpdf.BYTERANGE_PLACEHOLDER,
            signpdf.BYTERANGE_PLACEHOLDER,
        ],
        Contents: Buffer.from(String.fromCharCode(0).repeat(signpdf.SIGNATURE_MAX_LENGTH)),
        Reason: new String(reason),
        M: new Date(),
    });

    // Generate signature annotation widget
    const widget = pdf.ref({
        Type: 'Annot',
        Subtype: 'Widget',
        FT: 'Sig',
        Rect: [0, 0, 0, 0],
        V: signature,
        T: new String('Signature1'),
        F: 4,
        P: pdf._root.data.Pages.data.Kids[0],
    });
    // Include the widget in a page
    pdf._root.data.Pages.data.Kids[0].data.Annots = [
        widget,
    ];

    // Create a form (with the widget) and link in the _root
    const form = pdf.ref({
        SigFlags: 3,
        Fields: [widget],
    });
    pdf._root.data.AcroForm = form;

    return {
        signature,
        form,
        widget,
    }
}

/**
 * Creates a Buffer containing a PDF.
 * Returns a Promise that is resolved with the resulting Buffer of the PDFDocument.
 * @returns {Promise<Buffer>}
 */
const createPdf = () => {
    return new Promise((resolve) => {
        const pdf = new PDFDocument({
            autoFirstPage: true,
            size: 'A4',
            layout: 'portrait',
            bufferPages: true,
        });
        pdf.info.CreationDate = '';

        // Add some content to the page
        pdf
            .fillColor('#333')
            .fontSize(25)
            .moveDown()
            .text('node-signpdf');

        // Collect the ouput PDF
        // and, when done, resolve with it stored in a Buffer
        const pdfChunks = [];
        pdf.on('data', (data) => {
            pdfChunks.push(data);
        });
        pdf.on('end', () => {
            resolve(Buffer.concat(pdfChunks));
        });

        // Externally (to PDFKit) add the signature placeholder.
        const refs = addSignaturePlaceholder(pdf, 'I am the author');
        // Externally end the streams of the created objects.
        // PDFKit doesn't know much about them, so it won't .end() them.
        Object.keys(refs).forEach((key) => refs[key].end());

        // Also end the PDFDocument stream.
        // See pdf.on('end'... on how it is then converted to Buffer.
        pdf.end();
    });
};

describe('Test signpdf', () => {
    it('expects PDF to be Buffer', () => {
        expect(() => {
            signpdf.sign('non-buffer', Buffer.from(''));
        }).toThrow();
    });
    it('expects P12 certificate to be Buffer', () => {
        expect(() => {
            signpdf.sign(Buffer.from(''), 'non-buffer');
        }).toThrow();
    });
    it('signs input PDF', async (done) => {
        const pdfBuffer = await createPdf();
        console.log('it does not yet sign...');
        done();
    });
});
