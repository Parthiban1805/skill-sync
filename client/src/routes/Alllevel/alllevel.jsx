import axios from "axios"; // Ensure axios is imported
import sodium from 'libsodium-wrappers';
import React, { useEffect, useState } from "react";
import { useParams } from 'react-router-dom';
import "./alllevel.css";

const CourseTablePage = () => {
  const { id } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const[userId,setuserId]=useState(null);
  const[studentId,setstudentId]=useState(null);

  const [program, setProgram] = useState(null);
useEffect(() => {
    const fetchAllData = async () => {
      await sodium.ready;
  
      const encryptedData = sessionStorage.getItem("token");
      if (!encryptedData) {
        console.error("❌ No token found in sessionStorage!");
        return;
      }
  
      try {
        const { encrypted, nonce } = JSON.parse(encryptedData);
        console.log("🔐 Encrypted Token:", encrypted);
        console.log("🔑 Nonce:", nonce);
  
        const cryptoKey = sodium.from_base64(import.meta.env.VITE_SECRET_KEY);
  
        const decrypted = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(encrypted),
          sodium.from_base64(nonce),
          cryptoKey
        );
        console.log("🛠️ Decrypted Token:", decrypted);
  
        const token = new TextDecoder().decode(decrypted);
        console.log("📝 Decoded Token:", token);
  
        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
        console.log("💼 Decoded Payload:", decodedPayload);
  
        const {  userDetails } = decodedPayload;
        console.log("👥 User Details:", userDetails);
  
        if (!userDetails) {
          console.error("❌ userDetails not found in token!");
          return;
        }
  
        setUserDetails(userDetails);
  
        const { student_id,userId } = userDetails;
        setstudentId(student_id);
        setuserId(userId);
    
      } catch (error) {
        console.error("❌ Token decryption failed:", error);
      }
    };
  
    fetchAllData();
  }, []);
  useEffect(() => {
    console.log(id);  
    const fetchProgram = async () => {
      try {
        const response = await axios.get(`https://assessly-server.weacttech.com/skill-sync/programs/${id}`);
        console.log(response.data);
        setProgram(response.data);
      } catch (error) {
        console.error('Error fetching program details:', error);
      }
    };

    fetchProgram();
  }, [id]);

  const getProgramStatus = (levelNo) => {
    if (!userDetails || !userDetails.programCompleted) return "not-completed";
  
    console.log("Checking Level:", levelNo);
  
    const completedLevels = userDetails.programCompleted
      .filter(
        (p) => p.program_id_com.toString() === program._id.toString() && p.status === "completed"
      )
      .map((p) => p.levelNo);
  
    console.log("✅ Completed Levels for this program & student:", completedLevels);
  
    if (completedLevels.length === 0) return "not-completed";
  
    const maxCompletedLevel = Math.max(...completedLevels);
  
    console.log("Highest Completed Level:", maxCompletedLevel);
  
    return levelNo <= maxCompletedLevel ? "completed" : "not-completed";
  };
  
  
  

  return (
    <div className="total-level-table-page">
      <div className="total-level-table-header">
        <div className="total-level-title">Level Completion Status</div>
      </div>

      <table className="total-level-course-table">
        <thead>
          <tr>
            <th className="total-level-course-th">S.No</th>
            <th className="total-level-course-th">Level Name</th>
            <th className="total-level-course-th">My status</th>
          </tr>
        </thead>
        <tbody>
          {program?.levels?.map((level, index) => (
            <tr key={level._id} className="total-level-course-row">
              <td className="total-level-course-td">{index + 1}</td>
              <td className="total-level-course-td">{level.levelName}</td>
              <td className="total-level-course-td">
                {getProgramStatus( level.levelNo)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="total-level-course-pagination">
        <div className="total-level-course-pagination-text">Page 1 of 1</div>
        <select className="total-level-course-pagination-select">
          <option value="10">Rows per page: 10</option>
          <option value="20">Rows per page: 20</option>
        </select>
      </div>
    </div>
  );
};

export default CourseTablePage;
