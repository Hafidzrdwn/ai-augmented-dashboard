import { Routes, Route } from 'react-router-dom'
import DashboardPage from './pages/DashboardPage'
import TableauPage from './pages/TableauPage'

export default function App() {
  return (
    <Routes>
      <Route path="/"       element={<DashboardPage />} />
      <Route path="/tableau" element={<TableauPage />} />
    </Routes>
  )
}
