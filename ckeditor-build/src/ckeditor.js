/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ClassicEditorBase from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import EssentialsPlugin from '@ckeditor/ckeditor5-essentials/src/essentials';
import AutoformatPlugin from '@ckeditor/ckeditor5-autoformat/src/autoformat';
import BoldPlugin from '@ckeditor/ckeditor5-basic-styles/src/bold';
import ItalicPlugin from '@ckeditor/ckeditor5-basic-styles/src/italic';
import StrikePlugin from './strike';
import CodePlugin from '@ckeditor/ckeditor5-basic-styles/src/code';
import UnderlinePlugin from '@ckeditor/ckeditor5-basic-styles/src/underline';
import HeadingPlugin from '@ckeditor/ckeditor5-heading/src/heading';
import ListPlugin from '@ckeditor/ckeditor5-list/src/list';
import ParagraphPlugin from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import Range from '@ckeditor/ckeditor5-engine/src/model/range';

export default class ClassicEditor extends ClassicEditorBase {}

ClassicEditor.build = {
  plugins: [
    EssentialsPlugin,
    AutoformatPlugin,
    BoldPlugin,
    ItalicPlugin,
    StrikePlugin,
    CodePlugin,
    UnderlinePlugin,
    HeadingPlugin,
    ListPlugin,
    ParagraphPlugin
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
    }
  }
};

ClassicEditor.imports = { range: Range };
