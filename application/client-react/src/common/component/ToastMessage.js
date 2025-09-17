import React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { hideToastMessage } from '../../features/common/uiSlice';

const ToastMessage = () => {
  const { toastMessage } = useSelector((state) => state.ui);
  const dispatch = useDispatch();
  console.log("here", toastMessage);
  useEffect(() => {
    if (toastMessage) {
      const { message, status } = toastMessage;
      if (message !== "" && status !== "") {
        toast[status](message, { theme: "colored", // theme은 알림창의 색상을 성공/실패 등 상태에 맞춰 자동으로 칠해주는 스타일 옵션
          onClose: () => dispatch(hideToastMessage()), // 닫힐 때 상태 초기화
        }); //toast[status]는 toast.success, toast.error처럼 해당 값에 따라 색상 바뀜
      }    //message는 dispatch로 전달 받은 메시지를 여기서 받아서 출력.
    }
  }, [toastMessage]);
  return (
    <ToastContainer
      position="top-right"
      autoClose={5000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="light"
    />
  );
};

export default ToastMessage;