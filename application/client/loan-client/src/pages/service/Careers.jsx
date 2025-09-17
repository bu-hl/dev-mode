import React from 'react';
import { motion } from 'framer-motion';
import Footer from "../../components/Footer";

const Careers = () => {
  const jobOpenings = [
    {
      id: 1,
      title: "프론트엔드 개발자",
      department: "개발팀",
      location: "서울 강남구",
      type: "정규직",
      description: "깐부대출의 웹 서비스를 개발하고 개선하는 프론트엔드 개발자를 모집합니다.",
      requirements: [
        "React, Vue.js 등 프론트엔드 프레임워크 경험",
        "3년 이상의 웹 개발 경험",
        "TypeScript 사용 경험",
        "UI/UX에 대한 이해"
      ],
      benefits: [
        "유연근무제",
        "원격근무 가능",
        "성과급",
        "교육비 지원"
      ]
    },
    {
      id: 2,
      title: "백엔드 개발자",
      department: "개발팀",
      location: "서울 강남구",
      type: "정규직",
      description: "깐부대출의 서버 시스템을 개발하고 운영하는 백엔드 개발자를 모집합니다.",
      requirements: [
        "Node.js, Python 등 백엔드 개발 경험",
        "3년 이상의 서버 개발 경험",
        "데이터베이스 설계 및 최적화 경험",
        "마이크로서비스 아키텍처 이해"
      ],
      benefits: [
        "유연근무제",
        "원격근무 가능",
        "성과급",
        "교육비 지원"
      ]
    },
    {
      id: 3,
      title: "UX/UI 디자이너",
      department: "디자인팀",
      location: "서울 강남구",
      type: "정규직",
      description: "깐부대출의 사용자 경험과 인터페이스를 디자인하는 디자이너를 모집합니다.",
      requirements: [
        "3년 이상의 UX/UI 디자인 경험",
        "Figma, Sketch 등 디자인 도구 활용 능력",
        "사용자 리서치 및 프로토타이핑 경험",
        "금융 서비스 디자인 경험 우대"
      ],
      benefits: [
        "유연근무제",
        "원격근무 가능",
        "성과급",
        "교육비 지원"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">채용 정보</h1>
            <p className="text-xl text-gray-600">깐부대출과 함께 성장할 인재를 모집합니다</p>
          </motion.div>

          <div className="space-y-8">
            {jobOpenings.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h2>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                          {job.department}
                        </span>
                        <span className="px-3 py-1 text-sm font-medium text-gray-600 bg-gray-100 rounded-full">
                          {job.location}
                        </span>
                        <span className="px-3 py-1 text-sm font-medium text-green-600 bg-green-100 rounded-full">
                          {job.type}
                        </span>
                      </div>
                    </div>
                    <button className="mt-4 md:mt-0 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      지원하기
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">{job.description}</p>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">자격 요건</h3>
                      <ul className="space-y-2">
                        {job.requirements.map((req, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span className="text-gray-600">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">복리후생</h3>
                      <ul className="space-y-2">
                        {job.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-green-600 mr-2">•</span>
                            <span className="text-gray-600">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Careers; 