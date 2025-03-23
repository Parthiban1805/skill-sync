// CourseCard.js
import React from 'react';
import './CourseCard.css';

const CourseCard = ({ img, title }) => {
  return (
    <div className="course-card-container">
            <img src={img} alt={title} />
            <p>{title}</p>
    </div>
  );
};

export default CourseCard;
