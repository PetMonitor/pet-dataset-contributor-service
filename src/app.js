const express = require('express');
const morgan = require('morgan');

// Init app
const app = express();
const port = 3000;
const upload = require('./routes/upload');

// EJS
app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);

// logs
app.use(morgan('combined'));

// Public folder
app.use( express.static( `${__dirname}/public` ) );

app.get('/', (req, res) => res.render('upload'));
app.use('/upload', upload);

app.listen(process.env.PORT || port,
    () => console.log(`Listening on port ${port}`)
);
