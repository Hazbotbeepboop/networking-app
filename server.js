const express = require('express')
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
app.use(express.json())

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('Connection error:', err))

const peopleRoutes = require('./routes/people')
app.use('/people', peopleRoutes)

const entryRoutes = require('./routes/entries')
app.use('/entries', entryRoutes)

app.get('/', (req, res) => {
  res.send('Server is running')
})

const meRoutes = require('./routes/me')
app.use('/me', meRoutes)

const insightRoutes = require('./routes/insights')
app.use('/insights', insightRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))