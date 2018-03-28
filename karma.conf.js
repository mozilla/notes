const reporters = ["mocha", "coverage"];
if (process.env.COVERALLS_REPO_TOKEN) {
  reporters.push("coveralls");
}

module.exports = function(config) {
  config.set({
    singleRun: true,
    browsers: ["Firefox"],
    frameworks: ["mocha"],
    reporters,
    reportSlowerThan: 40,
    coverageReporter: {
      dir: "build/coverage",
      reporters: [
        {
          type: "lcov",
          subdir: "lcov"
        },
        {
          type: "html",
          subdir(browser) {
            // normalization process to keep a consistent browser name
            // across different OS
            return browser.toLowerCase().split(/[ /-]/)[0];
          }
        }, {type: "text-summary"}
      ]
    },
    files: [
      "src/vendor/*.js",
      "test/dist/unit-bundle.js",
    ],
    // coverage preprocessor doesn't cope with ES2017
    //preprocessors: {"src/*.js": ["coverage"]},
    plugins: [
      "karma-coveralls",
      "karma-coverage",
      "karma-firefox-launcher",
      "karma-mocha",
      "karma-mocha-reporter"
    ]
  });
};
