import GFMDataProcessor from '@ckeditor/ckeditor5-markdown-gfm/src/gfmdataprocessor';

// Simple plugin which loads the data processor.
export default function Markdown(editor) {
  editor.data.processor = new GFMDataProcessor();
  // Override `toData` to store data as HTML instead of Markdown
  // Ref: https://github.com/ckeditor/ckeditor5-markdown-gfm/blob/6fb1654dea22ec0f6eb9ae440fb6737b2a77715b/src/gfmdataprocessor.js#L60
  editor.data.processor.toData = function toData(viewFragment) {
    const html = this._htmlDP.toData(viewFragment);

    return html;
  }
}

