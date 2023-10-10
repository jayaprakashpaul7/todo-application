const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const express = require("express");
const path = require("path");
const app = express();
app.use(express.json());
const isValid = require("date-fns/isValid");
const isMatch = require("date-fns/isMatch");
const format = require("date-fns/format");

const dbPath = path.join(__dirname, "todoApplication.db");

let db;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is starting at http://localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
  }
};
initializeDbAndServer();

const convert = (req) => {
  return {
    id: req.id,
    todo: req.todo,
    priority: req.priority,
    status: req.status,
    category: req.category,
    dueDate: req.due_date,
  };
};

const hasPriorityAndstatus = (req) => {
  return req.priority !== undefined && req.status !== undefined;
};
const categoryAndstatus = (req) => {
  return req.category !== undefined && req.status !== undefined;
};
const categoryAndPriority = (req) => {
  return req.category !== undefined && req.priority !== undefined;
};
const hasStatus = (req) => {
  return req.status !== undefined;
};
const hasPriority = (req) => {
  return req.priority !== undefined;
};
const hasCategory = (req) => {
  return req.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  const { search_q = "", status, priority, category, offset } = request.query;
  let todosData = null;
  let todoQuery = "";
  switch (true) {
    case hasPriorityAndstatus(request.query):
      if (status === "DONE" || status === "TO DO" || status === "IN PROGRESS") {
        if (
          priority === "HIGH" ||
          priority === "LOW" ||
          priority === "MEDIUM"
        ) {
          todoQuery = `
                    SELECT * FROM todo 
                    WHERE todo LIKE '%${search_q}%' 
                    AND priority="${priority}"
                    AND status="${status}";`;
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case categoryAndstatus(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          status === "DONE" ||
          status === "TO DO" ||
          status === "IN PROGRESS"
        ) {
          todoQuery = `SELECT * FROM todo WHERE category = '${category}' AND status = "${status}";`;
        } else {
          response.status(400);
          response.send("Invalid Todo status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case categoryAndPriority(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          priority === "HIGH" ||
          priority === "LOW" ||
          priority === "MEDIUM"
        ) {
          todoQuery = `
            SELECT * FROM todo WHERE priority = '${priority}' AND category = "${category}";`;
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;

    case hasStatus(request.query):
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        todoQuery = `
                SELECT * FROM todo
                WHERE todo LIKE '%${search_q}%' 
                AND status='${status}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasPriority(request.query):
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        todoQuery = `
        SELECT * FROM todo 
        WHERE todo LIKE '%${search_q}%' 
        AND priority='${priority}';`;
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasCategory(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        todoQuery = `
          SELECT * FROM todo WHERE todo LIKE "%${search_q}%" AND category = "${category}";`;
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;
    default:
      todoQuery = `SELECT * FROM todo
           WHERE todo LIKE '%${search_q}%';`;
  }
  todosData = await db.all(todoQuery);
  response.send(todosData.map((each) => convert(each)));
});

app.get("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const selectTodo = `
    SELECT * FROM todo WHERE id = ${todoId}
;    `;
  const todo = await db.get(selectTodo);
  res.send(convert(todo));
});

app.get("/agenda/", async (req, res) => {
  const { date } = req.query;

  let selectDateQuery = "";
  if (date === undefined) {
    res.status(400);
    res.send("Invalid Due Date");
  } else {
    const isvalidDate = isValid(new Date(date));

    const matching = isMatch(date, "yyyy-MM-dd");

    if (isvalidDate) {
      const formatedDate = format(new Date(date), "yyyy-MM-dd");

      selectDateQuery = `
        SELECT * FROM todo WHERE due_date ='${formatedDate}';
        `;
      const todo = await db.all(selectDateQuery);

      res.send(todo.map((each) => convert(each)));
    } else {
      res.status(400);
      res.send("Invalid Due Date");
    }
  }
});
app.post("/todos/", async (req, res) => {
  const { id, todo, priority, status, category, dueDate } = req.body;
  const priorityArray = ["HIGH", "LOW", "MEDIUM"];
  const statusArray = ["DONE", "TO DO", "IN PROGRESS"];
  const categoryArray = ["LEARNING", "WORK", "HOME"];
  const dueDateObj = new Date(dueDate);

  const formateddate = format(new Date(dueDateObj), "yyyy-MM-dd");

  const isdateValid = isValid(new Date(dueDate), "yyyy-MM-dd");
  if (priorityArray.includes(priority)) {
    if (statusArray.includes(status)) {
      if (categoryArray.includes(category)) {
        if (dueDate !== undefined) {
          if (isdateValid) {
            const updatequery = `
                        INSERT INTO todo(id, todo, priority, status, category, due_date)
                        VALUES(
                            ${id},
                            '${todo}',
                            '${priority}',
                            '${status}',
                            '${category}',
                            '${formateddate}'
                        );
                        `;
            const updateResponse = await db.run(updatequery);
            res.send("Todo Successfully Added");
          } else {
            res.status(400);
            res.send("Invalid Due Date");
          }
        } else {
          res.status(400);
          res.send("Invalid Due Date");
        }
      } else {
        res.status(400);
        res.send("Invalid Todo Category");
      }
    } else {
      res.status(400);
      res.send("Invalid Todo Status");
    }
  } else {
    res.status(400);
    res.send("Invalid Todo Priority");
  }
});

app.put("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const { status, priority, category, dueDate, todo } = req.body;
  let updateQuery = "";
  let dbresponse = null;
  switch (true) {
    case req.body.status !== undefined:
      if (status === "TO DO" || status === "IN PROGRESS" || status === "DONE") {
        updateQuery = `
                UPDATE todo
                SET 
                    status ='${status}'
                WHERE id = ${todoId};
                `;
        dbresponse = await db.run(updateQuery);
        res.send("Status Updated");
      } else {
        res.status(400);
        res.send("Invalid Todo Status");
      }
      break;
    case req.body.priority !== undefined:
      if (priority === "HIGH" || priority === "LOW" || priority === "MEDIUM") {
        updateQuery = `
                UPDATE todo
                SET 
                    priority ='${priority}'
                WHERE id = ${todoId};
                `;
        dbresponse = await db.run(updateQuery);
        res.send("Priority Updated");
      } else {
        res.status(400);
        res.send("Invalid Todo Priority");
      }
      break;
    case req.body.todo !== undefined:
      updateQuery = `
                UPDATE todo
                SET 
                    todo ='${todo}'
                WHERE id = ${todoId};
                `;
      dbresponse = await db.run(updateQuery);
      res.send("Todo Updated");
      break;
    case req.body.category !== undefined:
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        updateQuery = `
                UPDATE todo
                SET 
                    category ='${category}'
                WHERE id = ${todoId};
                `;
        dbresponse = await db.run(updateQuery);
        res.send("Category Updated");
      } else {
        res.status(400);
        res.send("Invalid Todo Category");
      }
      break;
    case req.body.dueDate !== undefined:
      const dueDate = req.body.dueDate; // Assuming req.body.dueDate is a string
      const dueDateObj = new Date(dueDate);

      if (!isNaN(dueDateObj.getTime())) {
        const formatedDate = format(dueDateObj, "yyyy-MM-dd");
        updateQuery = `
        UPDATE todo
        SET 
            due_date ='${formatedDate}'
        WHERE id = ${todoId};
      `;

        dbresponse = await db.run(updateQuery);
        res.send("Due Date Updated");
      } else {
        res.status(400);
        res.send("Invalid Due Date");
      }
      break;
  }
});

app.delete("/todos/:todoId/", async (req, res) => {
  const { todoId } = req.params;
  const deleteQuery = `
    DELETE FROM todo
    WHERE id=${todoId};
    `;
  const dbresponse = await db.run(deleteQuery);
  res.send("Todo Deleted");
});

module.exports = app;

//ccbp submit NJSCADOQBS
