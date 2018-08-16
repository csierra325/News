var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var path = require("path")
var mongoose = require("mongoose");

var Article = require("./models/Articles");
var Note = require("./models/Note");



var cheerio = require("cheerio");
var request = require("request");

mongoose.Promise = Promise;




var PORT = process.env.PORT || 4040;
var app = express();

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(express.static("public"));

var exphbs = require("express-handlebars")



app.engine("handlebars", exphbs({
  defaultLayout: "main"
  // partialsDir: path.join(__dirname, "/views/layouts/partials")
}));
app.set("view engine", "handlebars");



mongoose.connect("mongodb://localhost/");
var db = mongoose.connection;

db.on("error", function (error) {
  console.log("Mongoose Error: ", error);
});

db.once("open", function () {
  console.log("Mongoose connection successful.")
});



// routes

app.get("/", function (req, res) {
  Article.find({
    "saved": false
  }, function (err, data) {
    var hbsObject = {
      article: data
    };
    console.log(hbsObject);
    res.render("index", hbsObject);
  });
});

app.get("/saved", function (req, res) {
  Article.find({
    "saved": true
  }).populate("notes").exec(function (err, articles) {
    var hbsObject = {
      article: articles
    };
    res.render("saved", hbsObject);
  });
});

app.get("/scrape", function (req, res) {
      request("https://atlantahumane.org/", function (err, response, html) {
          var $ = cheerio.load(html);

          $("article").each(function (i, element) {
            var result = {};
            result.title = $(this).children("entry-title").text();
            // result.summary = $(this).children(".entry-title").text();
            result.link = $(this).children("h4").children("a").attr("href");

            var entry = new Article(result);

            entry.save(function (err, doc) {
              if (err) {
                console.log(err);
              } else {
                console.log(doc);

              }
            });

          });
          res.send("Scrape Complete")
        });

      });

    // app.get("/", function(req, res){


    //   request("https://atlantahumane.org/", function (error, response, html) {

    //     var $ = cheerio.load(html);
    //     var results = [];
    //     $("h4.entry-title").each(function (i, element) {

    //       var link = $(element).children().attr("href");
    //       var title = $(element).children().text();

    //       results.push({
    //         title: title,
    //         link: link
    //       });
    //     });

    //     console.log(results);

    //   });


    // })

    app.get("/articles", function (req, res) {
      Article.find({}, function (err, doc) {
        if (error) {
          console.log(error);
        } else {
          res.json(doc);
        }
      })
    })

    app.get("/articles/:id", function (req, res) {

      Article.findOne({
          "_id": req.params.id
        })

        .populate("note")

        .exec(function (error, doc) {

          if (error) {
            console.log(error);
          } else {
            res.json(doc);
          }
        });
    });

    app.post("/articles/save/:id", function (req, res) {

      Article.findOneAndUpdate({
          "_id": req.params.id
        }, {
          "saved": true
        })

        .exec(function (err, doc) {

          if (err) {
            console.log(err);
          } else {

            res.send(doc);
          }
        });
    });

    // Delete an article
    app.post("/articles/delete/:id", function (req, res) {

      Article.findOneAndUpdate({
          "_id": req.params.id
        }, {
          "saved": false,
          "notes": []
        })

        .exec(function (err, doc) {

          if (err) {
            console.log(err);
          } else {

            res.send(doc);
          }
        });
    });


    // Create a new note
    app.post("/notes/save/:id", function (req, res) {

      var newNote = new Note({
        body: req.body.text,
        article: req.params.id
      });
      console.log(req.body)

      newNote.save(function (error, note) {

        if (error) {
          console.log(error);
        } else {

          Article.findOneAndUpdate({
              "_id": req.params.id
            }, {
              $push: {
                "notes": note
              }
            })

            .exec(function (err) {

              if (err) {
                console.log(err);
                res.send(err);
              } else {

                res.send(note);
              }
            });
        }
      });
    });


    app.delete("/notes/delete/:note_id/:article_id", function (req, res) {

      Note.findOneAndRemove({
        "_id": req.params.note_id
      }, function (err) {

        if (err) {
          console.log(err);
          res.send(err);
        } else {
          Article.findOneAndUpdate({
              "_id": req.params.article_id
            }, {
              $pull: {
                "notes": req.params.note_id
              }
            })

            .exec(function (err) {

              if (err) {
                console.log(err);
                res.send(err);
              } else {

                res.send("Note Deleted");
              }
            });
        }
      });
    }); app.listen(PORT, function () {
      console.log("I'm Listening to " + PORT)
    });