import BasePage from './base_page';
import NotePage from './note_page';

export default class ListPage extends BasePage {

  constructor(driver) {
    super(driver);
    this.listLocator = '.listView';
    this.newNoteBtnLocator = '.newNoteBtn';
  }

  async waitForPageToLoad() {
    this.logger.info('Waiting for list page load.');
    let element = await this.findElement(this.listLocator);
    await this.driver.wait(this
      .until
      .elementIsVisible(element), this.timeout);
    this.logger.info('List page loaded.');
    return this;
  }

  /**
  * @property notesList
  * @returns {Object} A list of notes found on the home page
  */
  get notesList() { return (async () =>
    {
      let elements = [];
      await this.findElement(this.listLocator);
      await this.findElement('ul');
      for(var item in await this.findElements('li')) {
        elements.push(new ListNote(this.driver, item));
        this.logger.info('Created ListNote class.')
      }
      return elements
    })();
  }

  /**
  * @function newNoteButton
  * @returns {Object} A Note Page Object
  * Clicks the 'new note' button
  */
  async newNoteButton() {
    let button = await this.findElement(this.newNoteBtnLocator);
    await button.click();
    return await new NotePage(this.driver).waitForPageToLoad();
  }
}

class ListNote extends ListPage {

  constructor(driver, root) {
    super(driver);
    this.titleLocator = 'div > p';
  }

  /**
  * @property clickBackButton
  * @returns {Object} The title of an individual note
  */
  get title() { return (async () =>
    {
      let element = await this.findElement(this.titleLocator);
      return element.getText();
    })();
  }
}
