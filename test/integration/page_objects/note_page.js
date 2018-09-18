import BasePage from './base_page';
import ListPage from './list_page';

export default class NotePage extends BasePage {

  constructor(driver) {
    super(driver);
    this.backBtnLocator = '.iconBtn';
    this.editorLocator = '.ck-editor__editable';
    this.feedbackBtnLocator = '.wrapper > ul:nth-child(1) >' +
      ' li:nth-child(5) > button:nth-child(1)'
    this.menuItemLocator = '.wrapper > ul:nth-child(1) >' +
      ' li:nth-child(4) > button:nth-child(1)';
    this.newNoteBtnLocator = '.wrapper > ul:nth-child(1) >' +
      ' li:nth-child(1) > button:nth-child(1)'
    this.noteTitleLocator = 'div > header > p';
    this.optionsMenuBtnLocator = '.photon-menu';
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
  * @function deleteNote
  * @returns {Object} A List Page object
  * Deletes the current note and returns to the List Page.
  */
  async deleteNote() {
    let btn = await this.findElement(this.optionsMenuBtnLocator);
    let menu = await this.findElement(this.menuItemLocator);
    let actions = this.driver.actions();
    await actions
          .move({origin: btn})
          .click()
          .move({origin: menu})
          .click()
          .perform();

    return await new ListPage(this.driver).waitForPageToLoad();
  }

  /**
  * @function addNewNote
  * @returns {Object} A Note Page object
  * Clicks the New Note button
  */
  async addNewNote() {
    let btn = await this.findElement(this.optionsMenuBtnLocator);
    let menu = await this.findElement(this.newNoteBtnLocator);
    let actions = this.driver.actions();
    await actions
          .move({origin: btn})
          .click()
          .move({origin: menu})
          .click()
          .perform();

    return await new NotePage(this.driver).waitForPageToLoad();
  }

  /**
  * @function addNote
  * @param  {string} title Title of the note you want top add
  * @param  {string} paragraph Paragraph of the note you want to add
  * @returns {Object} An object representing the page.
  * @throws ElementNotFound
  */
  async addNote(title = "This is a title", paragraph = 'This is a test!') {
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

  /**
  * @function clickGiveFeedback
  * Clicks the Give Feedback button and switch selenium focus to it.
  */
  async clickGiveFeedback() {
    let btn = await this.findElement(this.optionsMenuBtnLocator);
    let feedback = await this.findElement(this.feedbackBtnLocator);
    let actions = this.driver.actions();
    let currentWindows = await this.driver.getAllWindowHandles();

    await actions
          .move({origin: btn})
          .click()
          .move({origin: feedback})
          .click()
          .perform();

    await this.wait(
      async () => {
        let len = await this.driver.getAllWindowHandles();
        return len.length > currentWindows.length;
      },
      5000
    );

    let newWindows = await this.driver.getAllWindowHandles();
    await this.driver.switchTo().window(newWindows[1]);
  };
}
