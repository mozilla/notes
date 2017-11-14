import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import EssentialsPlugin from '@ckeditor/ckeditor5-essentials/src/essentials';
import AutoformatPlugin from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import BoldPlugin from '@ckeditor/ckeditor5-basic-styles/src/bold';
import ItalicPlugin from '@ckeditor/ckeditor5-basic-styles/src/italic';
import BlockquotePlugin from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import HeadingPlugin from '@ckeditor/ckeditor5-heading/src/heading';
import ImagePlugin from '@ckeditor/ckeditor5-image/src/image';
import ImagecaptionPlugin from '@ckeditor/ckeditor5-image/src/imagecaption';
import ImagestylePlugin from '@ckeditor/ckeditor5-image/src/imagestyle';
import ImagetoolbarPlugin from '@ckeditor/ckeditor5-image/src/imagetoolbar';
import LinkPlugin from '@ckeditor/ckeditor5-link/src/link';
import ListPlugin from '@ckeditor/ckeditor5-list/src/list';
import ParagraphPlugin from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import CodePlugin from '@ckeditor/ckeditor5-basic-styles/src/code';
import MarkdownPlugin from './markdown';

export default class ClassicEditor extends ClassicEditorBase {}

ClassicEditor.build = {
    plugins: [
        EssentialsPlugin,
        AutoformatPlugin,
        BoldPlugin,
        ItalicPlugin,
        BlockquotePlugin,
        HeadingPlugin,
        ImagePlugin,
        ImagecaptionPlugin,
        ImagestylePlugin,
        ImagetoolbarPlugin,
        LinkPlugin,
        ListPlugin,
        ParagraphPlugin,
        CodePlugin,
        MarkdownPlugin
    ],
    config: {
        toolbar: [
            'headings',
            'bold',
            'italic',
            'link',
            'bulletedList',
            'numberedList',
            'blockQuote',
            'code',
            'undo',
            'redo'
        ],
        image: {
            toolbar: [
                'imageStyleFull',
                'imageStyleSide',
                '|',
                'imageTextAlternative'
            ]
        }
    }
};