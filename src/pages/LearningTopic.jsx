import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { CategoryTree } from '../components/learning/CategoryTree.jsx';
import { TopicView } from '../components/learning/TopicView.jsx';
import { getCategory, getTopic } from '../data/learning.js';

export default function LearningTopic() {
  const { categoryId, topicId } = useParams();
  const category = getCategory(categoryId);
  const topic = category ? getTopic(categoryId, topicId) : null;

  if (!category || !topic) {
    return (
      <div className="surface rounded-3xl p-12 text-center">
        <div className="text-2xl mb-2">🤷</div>
        <h2 className="text-xl font-bold">Topic not found</h2>
        <Link to="/learning" className="mt-4 inline-flex items-center gap-1 text-aws-orange font-semibold hover:underline">
          <ArrowLeft size={14} /> Back to learning lab
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="hidden lg:block">
        <CategoryTree activeCategoryId={categoryId} activeTopicId={topicId} />
      </div>
      <TopicView category={category} topic={topic} />
    </div>
  );
}
