import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * ShareRedirect Page
 * 
 * Handles /p/:id route - redirects to /create page.
 * For social media crawlers, the edge function at /functions/v1/share-page
 * serves the OG meta tags before this component loads.
 */
const ShareRedirect = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to home page immediately
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground">Redirecting to INTENT...</p>
      </div>
    </div>
  );
};

export default ShareRedirect;
