// var screenshot = require("desktop-screenshot");

// screenshot("screenshot.png", function (error, complete) {
//   if (error) console.log("Screenshot failed", error);
//   else console.log("Screenshot succeeded");
// });

const activeWin = require("active-win");
const schedule = require("node-schedule");
const trackingController = require("./Controllers/trackingController");
const fs = require("fs-extra");
const _ = require("lodash");

let intervalId;
let intervalId2;

class ActivityTracker {
  constructor(filePath, interval) {
    this.filePath = filePath;
    this.interval = interval;
    this.start = null;
    this.app = null;
  }

  async storeData() {
    const newDate = new Date();
    let currentYear = newDate.getFullYear();
    let currentMonth =
      newDate.getMonth() + 1 < 10
        ? `0${newDate.getMonth() + 1}`
        : `${newDate.getMonth() + 1}`;
    let currentDay =
      newDate.getDate() < 10 ? `0${newDate.getDate()}` : newDate.getDate();
    let date = `${currentYear}-${currentMonth}-${currentDay}`;
    const content = await fs.readJson(this.filePath);
    const time = {
      start: this.start,
      end: new Date(),
    };
    const {
      url,
      owner: { name },
      title,
    } = this.app;

    _.defaultsDeep(content, {
      [date]: { [name]: { [title]: { time: 0, url } } },
    });

    content[date][name][title].time += Math.abs(time.start - time.end) / 1000;

    await fs.writeJson(this.filePath, content, { spaces: 2 });
  }

  track() {
    console.log("started tracking");
    intervalId = setInterval(async () => {
      const window = await activeWin();

      if (!this.app) {
        this.start = new Date();
        this.app = window;
      }

      if (window.title !== this.app.title) {
        await this.storeData();
        this.app = null;
      }
    }, this.interval);

    intervalId2 = setInterval(async () => {
      trackingController.saveOrUpdate();
    }, 1000 * 60 * 60);

    // schedule.scheduleJob("59 23 * * *", async () => {
    //   trackingController.saveOrUpdate();
    //   await fs.writeJson(this.filePath, "", { spaces: 2 });
    // });
  }

  async getChartData(date) {
    const data = await fs.readJson(this.filePath);
    const formatedData = [];

    Object.entries(data[date]).forEach(([key, val]) => {
      const programs = [];
      let totalTimeOnApp = 0;

      Object.entries(val).forEach(([prop, meta]) => {
        totalTimeOnApp += meta.time;
        programs.push({
          name: prop,
          url: meta.url,
          time: meta.time,
        });
      });

      formatedData.push({
        title: key,
        total: Math.floor(totalTimeOnApp),
        data: programs,
      });
    });

    return formatedData;
  }

  async init() {
    const fileExists = await fs.pathExists(this.filePath);

    if (!fileExists) {
      await fs.writeJson(this.filePath, {});
    }
    console.log("initialised tracking.json");
    this.track();
  }
  async stop() {
    console.log("stopped tracking");
    clearInterval(intervalId);
    clearInterval(intervalId2);
  }

  async findDataToPost() {
    const data = await fs.readJson(this.filePath);
    let dates = [];
    Object.entries(data).forEach(([key, val]) => {
      dates.push(key);
    });
    return dates;
  }

  async removeOldData(date) {
    let content = await fs.readJson(this.filePath);
    delete content[date];
    await fs.writeJson(this.filePath, content, { spaces: 2 });
    return true;
  }
}

module.exports = ActivityTracker;
