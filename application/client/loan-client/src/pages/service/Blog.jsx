import React from 'react';
import { motion } from 'framer-motion';
import Footer from "../../components/Footer";

const Blog = () => {
  const blogPosts = [
    {
      id: 1,
      title: "깐부대출, 친구 간 대출의 새로운 패러다임",
      date: "2025.05.15",
      category: "서비스 소개",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      excerpt: "깐부대출이 제시하는 새로운 친구 간 대출 시스템에 대해 알아봅니다.",
      author: "김대출",
      readTime: "5분"
    },
    {
      id: 2,
      title: "안전한 대출을 위한 5가지 팁",
      date: "2025.05.10",
      category: "금융 팁",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      excerpt: "친구 간 대출 시 반드시 알아야 할 안전한 대출 방법을 소개합니다.",
      author: "이안전",
      readTime: "7분"
    },
    {
      id: 3,
      title: "대출 이자 계산의 모든 것",
      date: "2025.05.05",
      category: "금융 지식",
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      excerpt: "대출 이자 계산 방법과 이자율의 중요성에 대해 알아봅니다.",
      author: "박이자",
      readTime: "6분"
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">깐부대출 블로그</h1>
            <p className="text-xl text-gray-600">금융 정보와 깐부대출의 최신 소식을 만나보세요</p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {blogPosts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
              >
                <div className="relative h-48">
                  <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-full">
                      {post.category}
                    </span>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center text-sm text-gray-500 mb-3">
                    <span>{post.date}</span>
                    <span className="mx-2">•</span>
                    <span>{post.readTime} 읽기</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 min-h-[3.5rem]">{post.title}</h2>
                  <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">{post.excerpt}</p>
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {post.author[0]}
                      </div>
                      <span className="ml-2 text-sm text-gray-600">{post.author}</span>
                    </div>
                    <button className="text-blue-600 font-medium hover:text-blue-800 transition-colors duration-200">
                      자세히 보기 →
                    </button>
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

export default Blog; 