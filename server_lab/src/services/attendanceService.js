const { Attendances } = require("../models");
const { Users } = require("../models");
const client = require("../mqtt");
const moment = require("moment");
const now = moment();
const formattedDate = now.format("DD/MM/YYYY");
client.client.subscribe("time_keeping_res");
const createAttendance = async (req, res) => {
  const { userCode } = req.body;
  if (!userCode) {
    return res.json({
      errCode: 1,
      message: "Dont enought information",
    });
  }
  try {
    const checkUser = await Users.findOne({
      where: { userCode: userCode },
    });
    if (!checkUser) {
      return res.json({
        errCode: 1,
        message: "Error,Check the Code again",
      });
    } else {
      // Tạo một promise để đợi phản hồi
      const waitForResponse = new Promise((resolve, reject) => {
        client.client.publish("time_keeping", `${userCode}`);
        setTimeout(() => {
          reject(new Error("Timeout waiting for response"));
        }, 2000); // Timeout sau 3 giây

        client.client.on("message", (topic, message) => {
          if (topic === "time_keeping_res") {
            const response = message.toString();
            resolve(response);
          }
        });
      });

      try {
        const response = await waitForResponse;
        console.log(response);
        if (response) {
          console.log(formattedDate);
           await Attendances.create({
             Time: formattedDate,
             UserId: checkUser.id,
           });
        }
        return res.json({
          message: "Successfully",
          errCode: 0,
          data: response,
        });
      } catch (error) {
        return res.json({
          errCode: 1,
          message: "No MQTT response . Please check",
          data: error.message,
        });
      }
    }
  } catch (error) {
    return res.json({
      errCode: -1,
      message: "err server",
      data: error,
    });
  }
};
const getFullAttendance = async (req, res) => {
  const { UserId, Time } = req.body;
  if (!UserId || !Time) {
    return res.json({
      errCode: 1,
      message: "Dont enought information",
    });
  }
  try {
      const user = await Users.findOne({
        where: { id: UserId },
      });
      const data = await Attendances.findAll({
        where: {
          UserId: UserId,
          Time: Time,
        },
        include: [
          {
            model: Users,
            as: "user",
            attributes: ["userName", "userCode", "userImage"],
          },
        ],
      });
      return res.json({
        errCode: 0,
        message: "get full successfuly",
        length: data.length,
        img: user.userImage,
        code: user.userCode,
        name : user.userName,
      });
    
  } catch (error) {
    return res.json({
      errCode: -1,
      message: "err server",
      data: error,
    });
  }
};
module.exports = {
  createAttendance,
  getFullAttendance,
};
