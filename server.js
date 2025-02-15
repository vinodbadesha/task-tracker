const express = require("express")
const app = express()

const {open} = require("sqlite")
const sqlite3 = require("sqlite3")
const path = require("path")
const dbPath = path.join(__dirname, "tasks.db")

let jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")
const { stat } = require("fs")
app.use(express.json())

let db

const initializeDbAndServer = async () => {
    try{
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        })
        app.listen(4000, () => {
            console.log("Server started at port 4000")
        })
    }
    catch(error){
        console.log(error.message)
        process.exit(1)
    }
}

initializeDbAndServer()

const authentication = async (request, response, next) => {
    let jwtToken
    const authHeaders = request.headers["authorization"]
    if (authHeaders){
        jwtToken = authHeaders.split(" ")[1]
    }

    if (jwtToken){
        jwt.verify(jwtToken, "MY_TOKEN", (error, payload) => {
            if (error){
                response.status(400)
                response.send("Invalid JWT Token")
            }
            else{
                request.name = payload.name,
                request.userId = payload.userId
                next()
            }
        })
    }
    else{
        response.status(400)
        response.send("Invalid JWT Token")
    }
    
}

// Register API

app.post("/register", async(request, response) => {
    const {name, email, password, createdAt} = request.body
    const hashedPassword = await bcrypt.hash(password, 10)
    const userQuery = `SELECT * FROM users where name = "${name}"`
    const userDetails = await db.get(userQuery)

    if (userDetails === undefined){
        const registerUser = `insert into users(name, email, password, created_at)
        values("${name}", "${email}", "${hashedPassword}", "${createdAt}")`

        await db.run(registerUser)
        response.send("User created successfully")
    }
    else{
        response.status(400)
        response.send("User already exists")
    }
})

// Login API

app.post("/login", async (request, response) => {
    const {name, password} = request.body
    const getUserQuery = `SELECT * FROM users WHERE name = "${name}"`
    const userData = await db.get(getUserQuery)

    if (userData === undefined){
        response.status(400)
        response.send("Invalid User")
    }
    else{
        const isPasswordMatched = await bcrypt.compare(password, userData.password)
        if (isPasswordMatched === true){
            const payload = {name: name}
            const jwtToken = jwt.sign(payload, "MY_TOKEN")
            response.send({jwtToken})
        }
        else{
            response.status(400)
            response.send("Invalid password")
        }
    }
})

// API-1

app.get("/tasks", authentication, async (request, response) => {
    const getTasks = `
        SELECT * FROM tasks
    `
    const tasks = await db.all(getTasks)
    response.send(tasks)
})

// API-2

app.post("/tasks", authentication, async (request, response) => {
    const {title, description, status, dueDate, userId} = request.body
    const addNewTask = `
        INSERT INTO tasks(title, description, status, due_date, user_id)
        VALUES ("${title}", "${description}", "${status}", "${dueDate}", ${userId})
    `
    await db.run(addNewTask)
    response.send("Task added successfully")
})

// API-3

app.put("/tasks/:id", authentication, async (request, response) => {
    const {id} = request.params
    const {title, description, status, dueDate, userId} = request.body
    const updateTask = `
        UPDATE tasks
        SET
            title = "${title}",
            description = "${description}",
            status = "${status}",
            due_date = "Updated on ${dueDate}"
        WHERE id = ${id}
    `
    await db.run(updateTask)
    response.send("Task Updates Succssfully")
})

// API-4

app.delete("/tasks/:id", authentication, async (request, response) => {
    const {id} = request.params
    const deleteQuery = `
        DELETE FROM tasks
        WHERE id = ${id}
    `
    await db.run(deleteQuery)
    response.send("Task Deleted")
})