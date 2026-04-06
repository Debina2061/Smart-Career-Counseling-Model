
const ErrorHandler = (fn)=>{
    return (req,res)=>{
        fn(req,res).catch(err=>{
            // Log the error with details
            console.error('\n❌❌❌ ERROR CAUGHT BY ErrorHandler ❌❌❌');
            console.error('Route:', req.method, req.path);
            console.error('Error type:', err?.constructor?.name || typeof err);
            console.error('Error message:', err?.message || err);
            console.error('Error stack:', err?.stack);
            console.error('❌❌❌ END ERROR ❌❌❌\n');
            
            // Determine status code
            const statusCode = err?.statusCode || err?.status || 500;
            const message = err?.message || "Internal Server Error";
            
            return res.status(statusCode).json({
                message: message,
                error: process.env.NODE_ENV === 'development' ? err?.message : undefined,
                data: null
            })
        })
    }
}

export {ErrorHandler};