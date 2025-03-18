import { useNavigate } from 'react-router-dom';
import './BackButton.css';

function BackButton() {
    const navigate = useNavigate();

    return (
        <div className="back-button-container">
            <button className="back-button" onClick={() => navigate('/calendar')}>📅</button> {/* 캘린더 페이지로 이동 */}
        </div>
    );
}

export default BackButton;
