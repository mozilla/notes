import { Builder, By, until } from 'selenium-webdriver';

import * as chai from 'chai';
import * as firefox from 'selenium-webdriver/firefox';

import ListPage from './page_objects/list_page';

const assert = chai.assert;
const expect = chai.expect;

describe('The Firefox Notes web extension', function() {
  const timeout = 10000;
  const defaultNoteTitle = "Welcome to Firefox Notes!";
  let addon_id;
  let addon;
  let options;
  var driver;

  this.timeout(20000);

  before(async function() {
    options = new firefox.Options();
    options.setPreference('xpinstall.signatures.required', false);
    options.setPreference('extensions.install.requireBuiltInCerts', false);
    options.setPreference('extensions.webapi.testing', true);
    options.setPreference('extensions.legacy.enabled', true);
  });

  beforeEach(async function() {
    driver = await new Builder()
      .forBrowser('firefox')
      .setFirefoxOptions(options)
      .build();
    addon = await driver.installAddon('firefox_notes.xpi');
    // Get addon numerical id
    await driver.setContext('chrome');
    addon_id = await driver.executeScript(
      'var Cu = Components.utils;' +
      'const {WebExtensionPolicy} = Cu.getGlobalForObject(Cu.import(' +
      '"resource://gre/modules/Extension.jsm", this));' +
      'return WebExtensionPolicy.getByID(arguments[0]).mozExtensionHostname;',
      addon
    );
    await driver.setContext('content');
    //load index html twice, as once seems to not load the app correctly
    for (var i = 0; i < 2; i++){
      await driver.get(`moz-extension://${addon_id}/sidebar/index.html`, timeout);
    }
    // Wait for page to load
    await driver.wait(until.elementLocated(By.css('.listView')), timeout);
    let header = await driver.findElement(By.css('.listView'));
    await driver.wait(until.elementIsVisible(header), timeout);
  });

  afterEach(async function() {
    await driver.quit();
  });

  it('should have a default note named correctly', async function() {
    let listPage = await new ListPage(driver).waitForPageToLoad();
    let notesList = await listPage.notesList();
    let notePage = await notesList[0].click();
    let noteTitle = await notePage.noteTitle;
    await driver.wait(
      () => noteTitle === defaultNoteTitle,
      timeout,
      "The note title was not correct!"
    );
  });

  it('should have a list of notes', async function() {
    // Check list of notes
    let listPage = await new ListPage(driver).waitForPageToLoad();
    let notesList = await listPage.notesList();
    let listNoteTitle = await notesList[0].getTitle();
    expect(listNoteTitle).to.equal(defaultNoteTitle);
  });

  it('should add a note', async function() {
    // Add a new note
    let listPage = await new ListPage(driver).waitForPageToLoad();
    let notePage = await listPage.newNoteButton();
    let title = "THIS IS A TEST";
    let paragraph = "this isnt a test";
    listPage = await notePage.clickBackButton();
    let newNote = await listPage.newNoteButton();
    await newNote.addNote(title, paragraph);
    listPage = await newNote.clickBackButton();
    let notesList = await listPage.notesList();
    let listNoteTitle = await notesList[0].getTitle();
    expect(listNoteTitle).to.equal(paragraph);
  });

});
