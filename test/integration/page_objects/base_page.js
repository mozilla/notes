const {By, until, Key} = require('selenium-webdriver');
const { createLogger, transports } = require('winston');
const { format } = require('logform');
const logger = createLogger({
  level: process.env.UI_TEST_LOGGING || 'silent',
  format: format.combine(
    format.colorize(),
    format.align(),
    format.printf(info => `${info.level}: ${info.message}`),
  ),
  transports: [
    new transports.Console(),
  ]
});

export default class BasePage {

  constructor(driver, timeout, root) {
    this.timeout = (timeout) ? timeout : 10000;
    this.driver = driver;
    this.by = By;
    this.key = Key;
    this.logger = logger;
    this.root = root;
    this.until = until;
    this.wait = driver.wait;
  }

  /**
  * @function waitForPageToLoad
  * @param  {string} locator CSS Selector of Element.
  * @returns {Object} An object representing the page.
  * @throws ElementNotFound
  */
  async waitForPageToLoad(locator) {
    let element = await this.findElement(locator);
    await this.driver.wait(this
      .until
      .elementIsVisable(element), this.timeout);
    return this;
  }

  /**
  * @function findElement
  * @param  {string} locator CSS Selector of Element.
  * @returns {Object} A WebElement object for element matching selector.
  * @throws ElementNotFound
  */
  async findElement(locator) {
    let element;

    this.logger.info(`Looking for element ${locator}`);
    this.waitForElement(locator);
    this.logger.info(`Found element ${locator}, returning it.`);
    if (this.root) {
      let root = this.driver.findElement(this.by.css(this.root));
      element = root.findElement(this.by.css(locator));
      return element;
    } else {
      let element = await this.driver.findElement(this.by.css(locator));
      return element;
    }
  }

  /**
  * @function findElements
  * @param  {string} locator CSS Selector of Element.
  * @returns {Object} A list of WebElements.
  * @throws ElementNotFound
  */
  async findElements(locator) {
    let elements = [];

    this.logger.info(`Looking for element ${locator}`);
    this.waitForElement(locator);
    this.logger.info(`Found element ${locator}, returning it.`);
    if (this.root) {
      let root = this.driver.findElement(this.by.css(this.root));
      elements = root.findElements(this.by.css(locator));
      return elements;
    }
    return await this.driver.findElements(this.by.css(locator));
  }

  /**
  * @function waitForElement
  * @param  {string} locator CSS Selector of Element.
  * @throws ElementNotFound
  */
  async waitForElement(locator) {
    this.logger.info(`Waiting for locator ${locator} to appear`);
    await this.driver.wait(this
      .until
      .elementLocated(this
        .by
        .css(locator)), this.timeout
    );
    this.logger.info(`Locator ${locator} appeared, returning it.`);
  }
}
