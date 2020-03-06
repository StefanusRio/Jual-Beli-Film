const express = require('express')
const bodyParser = require('body-parser')
const mysql = require('mysql')
const jwt = require('jsonwebtoken')
const app = express()

const secretKey = 'thisisverysecretkey'

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}))

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'jb_film'
})


db.connect((err) => {
    if (err) throw err
    console.log('Database connected')
})

const isAuthorized = (request, result, next) => {
    if (typeof(request.headers['x-api-key']) == 'undefined') {
        return result.status(403).json({
            success: false,
            message: 'Unauthorized. Token is not provided'
        })
    }

    let token = request.headers['x-api-key']

    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return result.status(401).json({
                success: false,
                message: 'Unauthorized. Token is invalid'
            })
        }
    })

    next()
}

app.get('/', (request, result) => {
    result.json({
        success: true,
        message: 'Welcome'
    })
})

app.post('/login', (request, result) => {
    let data = request.body

    if (data.username == 'admin' && data.password == 'admin') {
        let token = jwt.sign(data.username + '|' + data.password, secretKey)

        result.json({
            success: true,
            message: 'Login success, welcome back Admin!',
            token: token
        })
    }

    result.json({
        success: false,
        message: 'You are not person with username admin and have password admin!'
    })
})

//FILM

app.get('/films', (request, res) => {
    let sql = `
    select * from films
    `

    db.query(sql, (err, result) => {
        if (err) throw err
        res.json({
            success:true,
            message: "Your film is ready",
            data: result
        })
    })
})
    
app.post('/films', isAuthorized, (request, result) => {
    let data = request.body

    let sql = `
        insert into films (judul, tahun_terbit, genre, produksi, ringkasan)
        values ('`+data.judul+`', '`+data.tahun_terbit+`', '`+data.genre+`', '`+data.produksi+`', '`+data.ringkasan+`');
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Your new film is ready'
    })
})

app.put('/films/:id', isAuthorized, (request, result) => {
    let data = request.body

    let sql = `
        update films
        set judul = '`+data.judul+`', tahun_terbit = '`+data.tahun_terbit+`', genre = '`+data.genre+`', produksi = '`+data.produksi+`', ringkasan = '`+data.ringkasan+`'
        where id = `+request.params.id+`
    `

    db.query(sql, (err, result) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data film has been updated'
    })
})

app.delete('/films/:id', isAuthorized, (request, result) => {
    let sql = `
        delete from films where id = `+request.params.id+`
    `

    db.query(sql, (err, res) => {
        if (err) throw err
    })

    result.json({
        success: true,
        message: 'Data has been deleted'
    })
})

//USER

app.get('/users', isAuthorized, (req, res) => {
    let sql = `
    select id, username, created_at from users
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get all user",
            data: result
        })
    })
})

app.post('/users', isAuthorized, (req, res) => {
    let data = req.body

    let sql = `
    insert into users (username, password)
    values ('`+data.username+`', '`+data.password+`')
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "user created",
            data: result
        })
    })
})

app.get('/users/:id', isAuthorized, (req, res) => {
    let sql = `
    select * from users
    where id = `+req.params.id+`
    limit 1
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get user's detail",
            data: result[0]
        })
    })
})

app.put('/users/:id', isAuthorized, (req, res) => {
    let data = req.body

    let sql = `
    update users
    set username = '`+data.username+`', password = '`+data.password+`'
    where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "data has been updated",
            data: result
        })
    })
})

app.delete('/users/:id', isAuthorized, (req, res) => {
    let sql = `
    delete from users
    where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "data has been deleted",
            data: result
        })
    })
})

//TRANSAKSI

app.post('/films/:id/take', isAuthorized, (req, res) => {
    let data = req.body

    db.query(`
        insert into transaksi (user_id, film_id)
        values ('`+data.user_id+`', '`+req.params.id+`')
    `, (err, result) => {
        if (err) throw err
    })

    db.query(`
        update films
        set stock = stock - 1
        where id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err
    })

    res.json({
        message: "Films has been taked by user"
    })
})

app.get('/users/:id/films', isAuthorized, (req, res) => {
    db.query(`
        select films.judul, films.tahun_terbit, films.genre, films.produksi, films.ringkasan, films.stock
        from users
        right join transaksi on users.id = transaksi.user_id
        right join films on transaksi.film_id = films.id
        where users.id = '`+req.params.id+`'
    `, (err, result) => {
        if (err) throw err

        res.json({
            message: "success get user's films",
            data: result
        })
    })
})

app.put('/transaksi/:id', isAuthorized, (req, res) => {  
    let data = req.body

    let sql = `
        update transaksi
        set user_id = '`+data.user_id+`', film_id= '`+data.film_id+`'
        where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err

        res.json({
            message: "data has been updated",
            data: result
        })
    })
})

app.delete('/transaksi/:id', isAuthorized, (req, res) => {
    let sql = `
        delete from transaksi
        where id = '`+req.params.id+`'
    `

    db.query(sql, (err, result) => {
        if (err) throw err
        
        res.json({
            message: "data has been deleted",
            data: result
        })
    })
})

app.listen(3000, () => {
    console.log('App is running on port 3000')
})