const {Builder, By, until} = require('selenium-webdriver');

var chai = require('chai');
var firefox = require('selenium-webdriver/firefox');
var assert = chai.assert;
var expect = chai.expect;

import NotePage from './page_objects/note_page';

describe('The Firefox Notes web extension', function() {
  var driver;
  let addon;
  let options;
  let timeout = 10000;

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
    let addon = await driver.installAddon('firefox_notes.xpi');
    // Get addon numerical id
    await driver.setContext('chrome');
    let addon_id = await driver.executeScript(
      'var Cu = Components.utils;' +
      'const {WebExtensionPolicy} = Cu.getGlobalForObject(Cu.import(' +
      '"resource://gre/modules/Extension.jsm", this));' +
      'return WebExtensionPolicy.getByID(arguments[0]).mozExtensionHostname;',
      addon
    );
    await driver.setContext('content');
    await driver.get(`moz-extension://${addon_id}/sidebar/index.html`, timeout);
    // Wait for page to load
    await driver.wait(until.elementLocated(By.tagName('header')), timeout);
    let header = await driver.findElement(By.tagName('header'));
    await driver.wait(until.elementIsVisible(header), timeout);
  });

  afterEach(async function() {
    await driver.quit();
  });

  it('should have a default note named correctly', async function() {
    let notePage = new NotePage(driver);
    let noteTitle = await notePage.noteTitle;
    await driver.wait(
      () => noteTitle === "Welcome to Firefox Notes!",
      timeout,
      "The note title was not correct!"
    );
  });

  it('should have a list of notes', async function() {
    // Check list of notes
    let notePage = new NotePage(driver);
    let listPage = await notePage.clickBackButton();
    let notesList = await listPage.notesList();
    let listNoteTitle = await notesList[0].getTitle();
    expect(listNoteTitle).to.equal("Welcome to Firefox Notes!");
  });

  it('should add a note', async function() {
    // Add a new note
    let notePage = new NotePage(driver);
    let title = "THIS IS A TEST";
    let paragraph = "this isnt a test";
    let listPage = await notePage.clickBackButton();
    let newNote = await listPage.newNoteButton();
    await newNote.addNote(title, paragraph);
    listPage = await newNote.clickBackButton();
    let notesList = await listPage.notesList();
    let listNoteTitle = await notesList[0].getTitle();
    expect(listNoteTitle).to.equal(paragraph);
  });
});
