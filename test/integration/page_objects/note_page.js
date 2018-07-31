import BasePage from './base_page';
import ListPage from './list_page';

export default class NotePage extends BasePage {

  constructor(driver) {
    super(driver);
    this.backBtnLocator = '.iconBtn';
    this.editorLocator = '.ck-editor__editable';
    this.noteTitleLocator = 'div > header > p';
  }

  async waitForPageToLoad() {
    this.logger.info('Waiting for note page load.');
    let element = await this.findElement(this.backBtnLocator);
    await this.driver.wait(this
      .until
      .elementIsVisible(element), this.timeout);
    this.logger.info('Note page loaded.');
    return this;
  }

  /**
  * @property noteTitle
  * @returns {Object} The title of the note
  */
  get noteTitle() { return (async () =>
    {
      let title = await this.findElement(this.noteTitleLocator);
      return title.getText();
    })();
  }

  /**
  * @function clickBackButton
  * @returns {Object} A List Page object
  * Clicks the back button to return to the list page
  */
  async clickBackButton() {
    let btn = await this.findElement(this.backBtnLocator);
    await btn.click();
    return await new ListPage(this.driver).waitForPageToLoad();
  }

  /**
  * @function addNote
  * @param  {string} title Title of the note you want top add
  * @param  {string} paragraph Paragraph of the note you want to add
  * @returns {Object} An object representing the page.
  * @throws ElementNotFound
  */
  async addNote(title, paragraph) {
    this.logger.info('Adding a new note');
    let editor = await this.driver.findElement(this.by.css(this.editorLocator));
    await editor.sendKeys(title, this.key.ENTER, paragraph);
    // Find note title before we wait for it to change
    let thisNoteTitle = await this
      .driver
      .findElement(this.by.css(this.noteTitleLocator));
    await this.driver.wait(
        this.until.elementTextIs(thisNoteTitle, paragraph),
      this.timeout
    );
    this.logger.info('Note added');
  }
}
