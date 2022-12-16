const toArrayBuffer = (preKeyBundle) => {
    let temp = JSON.parse(JSON.stringify(preKeyBundle));
    temp.identityKey = helpers.base64ToArrayBuffer(preKeyBundle.identityKey)
    temp.preKey.publicKey = helpers.base64ToArrayBuffer(preKeyBundle.preKey.publicKey)
    temp.signedPreKey.publicKey = helpers.base64ToArrayBuffer(preKeyBundle.signedPreKey.publicKey)
    temp.signedPreKey.signature = helpers.base64ToArrayBuffer(preKeyBundle.signedPreKey.signature)
    return temp;
}
import { v4 as uuidv4 } from 'uuid';
import {encryptMessage, decryptMessage} from './../services/signal/index'
import CarouselCaption from 'react-bootstrap/lib/carouselcaption';
// import PropTypes from 'prop-types';
import helpers from './../services/signal/helpers'
import UserService from './../services/userService'
dayjs.extend(relativeTime);
dayjs.locale('vi');

const toArrayBuffer = (preKeyBundle) => {
    let temp = JSON.parse(JSON.stringify(preKeyBundle));
    temp.identityKey = helpers.base64ToArrayBuffer(preKeyBundle.identityKey)
    temp.preKey.publicKey = helpers.base64ToArrayBuffer(preKeyBundle.preKey.publicKey)
    temp.signedPreKey.publicKey = helpers.base64ToArrayBuffer(preKeyBundle.signedPreKey.publicKey)
    temp.signedPreKey.signature = helpers.base64ToArrayBuffer(preKeyBundle.signedPreKey.signature)
    return temp;
}

const renderMessages = (list, scroll, type) => {
    const currentUserId = JSON.parse(localStorage.getItem('user'))._id;
    const currentChatId = window.location.pathname.split('/').pop();
    list = list.filter((message) => message.chatGroupID === currentChatId);
    let htmlMessage = [];
    if (list.length === 0) {
        return;
    }

    htmlMessage = list.map((message, idx) => {
        const authorId = message.author?._id || message.author;
        return authorId === currentUserId ? (
            <li className="d-flex conversation-item-right" key={message._id || uuidv4()} ref={scroll}>
                <div className="conversation-item d-flex align-items-end">
                    <div className="conversation-content flex-grow-1">
                        <div className="message-wrap primary-bgcolor color-white">
                            
                        </div>
                    </div>
                </div>
            </li>
        ) : (
            <li className="d-flex" key={message._id} ref={scroll}>
                <div className="conversation-item d-flex align-items-end">
                    <div className="conversation-avt me-3 avatar-xs avatar">
                        <img
                            src={message.author?.avatar || message?.avatar}
                            alt=""
                            // width="100%"
                        />
                    </div>
                    <div className="conversation-content flex-grow-1 w-100 ">
                        <div className="message-wrap secondary-bgcolor text-color-dark w-100">
                            <div>
                                {message.body}
                                
                            </div>
                        </div>
                        {type === 1 ? <h6 className="sub-text pt-3 pb-2">{message.author?.fullname}</h6> : null}
                    </div>
                </div>
            </li>
        );
    });

    htmlMessage.unshift(
        <div className="chat-day" key={-1}>
            <span className="chat-day-title">{getTimeline(list[0]?.createAt)}</span>
        </div>
    );

    return htmlMessage;
    
};

const Chat = ({recentChat}) => {
    const { socket } = useContext(SocketContext);
    const dispatch = useDispatch();
    const scroll = useRef(null);
    const inp = useRef();
    const location = useLocation();
    const navigate = useNavigate();
    const { register, handleSubmit } = useForm();
    const { roomMessage, selectedChat, newDirectChat, receiverKey } = useSelector((state) => state.chat);
    const [listMessage, setListMessage] = useState(roomMessage);
    const user = useSelector((state) => state.user);

    const onSendMessage = async (data) => {
        try {
            if (!inp.current.value) return;
            // Mã hoá tin nhắn trước khi gửi lên server
            console.log(selectedChat)
            let message = {
                author: user.user._id,
                avatar: user.user.avatar || '',
                body: inp.current.value,
                chatGroupID: location.pathname.split('/').pop(),
                createAt: new Date(),
                receiver: newDirectChat ? newDirectChat[1] : null,
            };
            // let cipherText = encryptMessage()
            
            const [currentChat] = recentChat.filter((e) => e._id === message.chatGroupID && e.type === 0);
            console.log(recentChat)
            let encrypted = null;
            if(currentChat){
                const [{_id: receiverId}] = currentChat.members.filter(mem => mem._id !== user.user._id )
    
                // TODO: Encrypt message
                console.log(receiverKey)
                const bundleKey = toArrayBuffer(receiverKey)
                encrypted = await encryptMessage(receiverId, message.body, window.encyptStore, bundleKey)
                console.log(encrypted)
                
            }
            setListMessage((prev) => [...prev, message]);
            
            socket.emit('send_message', {message, encrypted});
    
            let isYours = true;
    
            message = { ...message, isYours, createAt: message.createAt.toString() };
    
            dispatch(lastestMessage(message));
            inp.current.value = '';
            inp.current.focus();
        }catch (err ){
            console.error(err);
        }
        
    };

    const handleGoback = () => {
        document.querySelector('.sidebar-container').classList.remove('hidden');
        document.querySelector('.navbar-container').classList.remove('hidden');
        document.querySelector('.chat-container').classList.remove('un-hidden');
        navigate('/');
    };

    const onOpenChatInfo = () => {
        dispatch(openChatInfo());
    };

    useEffect(() => {
        socket.on('receive_message', async ({newMessage, encrypted}) =>  {

            // TODO: decryptMessage here
            if(newMessage.body && user.user._id !== newMessage.author._id && encrypted){
                const response = await UserService.getPrekeyBundle(newMessage.author._id)
                let decrypted = await decryptMessage(newMessage.author._id, encrypted, window.encyptStore, toArrayBuffer(response.data))
                console.log(decrypted)
            }


            if (newMessage.body || newMessage.avatar || user.user._id !== newMessage.author) {
                console.log("hehe")
                let isYours;
                if (user.user._id === newMessage.author._id) {
                    isYours = true;
                } else isYours = false;
                if (!isYours) {

                    setListMessage((prev) => [...prev, newMessage]);
                }

                newMessage = { ...newMessage, isYours, createAt: newMessage.createAt.toString() };
                if (!isYours) {
                    dispatch(lastestMessage(newMessage));
                }
            }
        });
    }, [dispatch, socket, user.user._id]);

    // real time notification
    useEffect(() => {
        socket.on('notification', (data) => {
            if (data.body) {
                dispatch(addNotifications(data.chatGroupID));
            }
        });
    }, [dispatch, socket]);

    useEffect(() => {
        if (roomMessage) {
            setListMessage(roomMessage);
        }
    }, [roomMessage]);

    // scroll to last message
    useEffect(() => {
        scroll.current?.scrollIntoView({ behavior: 'smooth' });
    }, [listMessage]);

    useEffect(() => {
        socket.on('messages_room', (data) => {
            dispatch(loadMessageRoom(data));
        });
    }, [socket, dispatch]);

    return selectedChat ? (
        <Row className="h-100 ">
            <div className="user-chat position-relative d-flex flex-column">
                <div className="chat-header">
                    <Row className="align-items-center">
                        <Col lg={5} xs={8}>
                            <div className="d-flex align-items-center">
                                <div id="goback" onClick={handleGoback}>
                                    <BsArrowLeft />
                                </div>
                                <div className="me-4 position-relative">
                                    <div className="avatar-xs avatar">
                                        <img src={selectedChat?.targetAvatar} alt="" />
                                    </div>

                                    <div className="active-status online"></div>
                                    <div class="col-md-8">
            <div class="card">
                <div class="card-header">{{ __('Login') }}</div>

                <div class="card-body">
                    <form method="POST" action="{{ route('login') }}">
                        @csrf

                        <div class="row mb-3">
                            <label for="email" class="col-md-4 col-form-label text-md-end">{{ __('Email Address') }}</label>

                            <div class="col-md-6">
                                <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" required autocomplete="email" autofocus>

                                @error('email')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                            </div>
                        </div>

                        <div class="row mb-3">
                            <label for="password" class="col-md-4 col-form-label text-md-end">{{ __('Password') }}</label>

                            <div class="col-md-6">
                                <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" required autocomplete="current-password">

                                @error('password')
                                    <span class="invalid-feedback" role="alert">
                                        <strong>{{ $message }}</strong>
                                    </span>
                                @enderror
                            </div>
                        </div>

                        <div class="row mb-3">
                            <div class="col-md-6 offset-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="remember" id="remember" {{ old('remember') ? 'checked' : '' }}>

                                    <label class="form-check-label" for="remember">
                                        {{ __('Remember Me') }}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="row mb-0">
                            <div class="col-md-8 offset-md-4">
                                <button type="submit" class="btn btn-primary">
                                    {{ __('Login') }}
                                </button>

                                @if (Route::has('password.request'))
                                    <a class="btn btn-link" href="{{ route('password.request') }}">
                                        {{ __('Forgot Your Password?') }}
                                    </a>
                                @endif
                            </div>
                        </div>
                    </form>
                                <li key={4}>
                                    <BsFillInfoCircleFill fontSize="22px" onClick={onOpenChatInfo} />
                                </li>
                                <li key={5}>
                                    <BiDotsVerticalRounded fontSize="22px" />
                                </li>
                            </ul>
                        </Col>
                    </Row>
                </div>
                    <div>
                        <ul className="list-unstyled chat-conversation-list mt-0 scroll-bar">
                            {listMessage?.length > 0 ? renderMessages(listMessage, scroll, selectedChat.type) : null}
                        </ul>
                    </div>
                </div>
                <div className="chat-input mt-auto p-3 p-lg-4">
                    <form id="chatinput-form" onSubmit={handleSubmit(onSendMessage)}>
                        <Row className="align-items-center">
                            <Col className="col-auto">
                                <button className="input-chat-icon">
                                    <BiDotsHorizontalRounded fontSize="22px" color="#6159CB" />
                                </button>
                                <button className="input-chat-icon">
                                    <BiSmile fontSize="22px" color="#6159CB" />
                                </button>
                            </Col>

                            <Col className="h-100">
                                <input
                                    type="text"
                                    {...register('inp_message')}
                                    id="inp-message"
                                    placeholder="Soạn tin nhắn..."
                                    autoComplete="off"
                                    ref={inp}
                                />
                            </Col>

                            <Col className="col-auto">
                                <button className="input-chat-icon">
                                    <BiMicrophone fontSize="22px" color="#6159CB" />
                                </button>
                                <button type="submit" className="input-chat-icon bg-main">
                                    <MdSend fontSize="22px" />
                                </button>
                            </Col>
                        </Row>
                    </form>
                </div>
            </div>
        </Row>
    ) : (
        <Row className="h-100 ">
            <GetStarted />
        </Row>

        <div class="row mb-3">
                            <div class="col-md-6 offset-md-4">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" name="remember" id="remember" {{ old('remember') ? 'checked' : '' }}>

                                    <label class="form-check-label" for="remember">
                                        {{ __('Remember Me') }}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="row mb-0">
                            <div class="col-md-8 offset-md-4">
                                <button type="submit" class="btn btn-primary">
                                    {{ __('Login') }}
                                </button>

                                @if (Route::has('password.request'))
                                    <a class="btn btn-link" href="{{ route('password.request') }}">
                                        {{ __('Forgot Your Password?') }}
                                    </a>
                                @endif
                            </div>
                        </div>
                    </form>
                </div>
    );
};

Chat.propTypes = {};

export default Chat;
