/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import AutoformatPlugin from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import BlockquotePlugin from '@ckeditor/ckeditor5-block-quote/src/blockquote';
import BoldPlugin from '@ckeditor/ckeditor5-basic-styles/src/bold';
import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import CodePlugin from '@ckeditor/ckeditor5-basic-styles/src/code';
import EssentialsPlugin from '@ckeditor/ckeditor5-essentials/src/essentials';
import HeadingPlugin from '@ckeditor/ckeditor5-heading/src/heading';
import ItalicPlugin from '@ckeditor/ckeditor5-basic-styles/src/italic';
import ListPlugin from '@ckeditor/ckeditor5-list/src/list';
import ParagraphPlugin from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Range from '@ckeditor/ckeditor5-engine/src/model/range';
import StrikePlugin from '@ckeditor/ckeditor5-basic-styles/src/strikethrough';
import UnderlinePlugin from '@ckeditor/ckeditor5-basic-styles/src/underline';

export default class ClassicEditor extends ClassicEditorBase {}

ClassicEditor.build = {
  plugins: [
    AutoformatPlugin,
    BlockquotePlugin,
    BoldPlugin,
    CodePlugin,
    EssentialsPlugin,
    HeadingPlugin,
    ItalicPlugin,
    ListPlugin,
    ParagraphPlugin,
    StrikePlugin,
    UnderlinePlugin,
  ],
  config: {
    toolbar: {
      items: [
        'headings',
        'bulletedList',
        'numberedList',
        'bold',
        'italic',
        'strike',
        'code'
      ]
    },
    language: 'en'
  }
};

ClassicEditor.imports = { range: Range };
