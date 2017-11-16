import GFMDataProcessor from '@ckeditor/ckeditor5-markdown-gfm/src/gfmdataprocessor';

// Simple plugin which loads the data processor.
export default function Markdown(editor) {
  editor.data.processor = new GFMDataProcessor();
}
