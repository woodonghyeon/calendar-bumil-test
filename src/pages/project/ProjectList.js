import React, { useState, useEffect, useRef } from "react";
import ProjectCard from "./ProjectCard";
import "./ProjectList.css";

/**
 * 📌 ProjectList - 프로젝트 목록을 보여주는 컴포넌트
 *
 * ✅ 주요 기능:
 * - 프로젝트 목록 조회 (GET /project/get_all_project)
 * - 무한 스크롤 기능
 *
 * ✅ UI (또는 Component) 구조:
 * - ProjectList (프로젝트 목록)
 * └── ProjectCard (프로젝트 카드)
 *
 */

const ProjectList = ({ projects }) => {
  const [displayedProjects, setDisplayedProjects] = useState([]); // 렌더링할 프로젝트 목록
  const [loadedCount, setLoadedCount] = useState(5); // 로드된 프로젝트 수 (초기값: 5)
  const observerRef = useRef(null); // IntersectionObserver를 위한 ref
  const [loading, setLoading] = useState(false); // 로딩 중 여부

  // 렌더링할 프로젝트 목록 설정
  useEffect(() => {
    setDisplayedProjects(projects.slice(0, loadedCount));
  }, [projects, loadedCount]);

  // 무한 스크롤 기능
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && loadedCount < projects.length) {
          setLoading(true);
          setTimeout(() => {
            setLoadedCount((prev) => prev + 5);
            setLoading(false);
          }, 1000);
        }
      },
      { threshold: 1.0 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [loadedCount, projects]);

  return (
    <div className="project-list">
      {/* 개별 프로젝트 카드 렌더링 (클릭 이벤트는 ProjectCard 내부에서 처리) */}
      {displayedProjects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}

      {/* 스크롤 감지를 위한 빈 div */}
      <div ref={observerRef} className="h-10"></div>

      {/* 로딩 중 메시지 */}
      {loading && <p className="loading-text">로딩 중...</p>}
    </div>
  );
};

export default ProjectList;
