import { LoadingState, Spinner } from '../ui';

/**
 * Kept as a named entry point because several modules imported it - the file
 * itself used to be empty, which broke any page that tried to render it.
 */
const LoadingSpinner = ({ label, className }) => <LoadingState label={label} className={className} />;

export { Spinner };
export default LoadingSpinner;
