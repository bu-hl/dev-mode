import './App.css';
import ToastMessage from './common/component/ToastMessage';
import AppRouter from './routes/AppRouter';

// npm install react-toastify 해주세요.

function App() {
  return (
    <div>
      <AppRouter/>
      <ToastMessage/>
    </div>
  );
}

export default App; 

//리액트 연동 테스트용 코드

// import React, { useState } from 'react';
// import WillForm from './components/WillForm';
// import WillList from './components/WillList';
// import WillDetails from './components/WillDetails';

// function App() {
//   const [selectedWillId, setSelectedWillId] = useState(null);

//   return (
//     <div className="container mt-4">
//       <h2>마침표 - 디지털 유언장</h2>
//       <WillForm />
//       <hr />
//       <WillList onSelect={setSelectedWillId} />
//       <hr />
//       <WillDetails willId={selectedWillId} />
//     </div>
//   );
// }

// export default App;

